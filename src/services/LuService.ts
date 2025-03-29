import { ChildProcess, spawn, SpawnOptionsWithoutStdio } from 'child_process';
import * as path from 'path';
import TempFileService from './TempFileService';
import { promises as fs } from 'fs';
import Stream from 'stream';
import config from '../constants/config';
import { exec } from 'child_process';
import quote from 'shell-quote/quote';

type ExitCode = number;

export function success(code: ExitCode) {
    return code === 0;
}

export class RunResult {
    exitCode: ExitCode;
    output: string;

    constructor(output: string, exitCode: ExitCode) {
        this.output = output;
        this.exitCode = exitCode;
    }

    public success(): boolean {
        return this.exitCode === 0;
    }
}

function defaultKill(child: ChildProcess) {
    return new Promise((resolve) => resolve(child.kill('SIGKILL')));
}

function dockerKillName(name: string) {
    return (child: ChildProcess) => {
        return new Promise((resolve) => exec(`docker kill ${name}`, (error) => {
            if (error) {
                console.error(`error killing docker container ${name} (pid ${child.pid}): ${error?.message} exited with code ${error.code}`);
                return resolve(false);
            }
            return resolve(true);
        }));
    }
}

async function runOnOutput(
    command: string, args: string[], options: SpawnOptionsWithoutStdio,
    onStdout: (chunk: string) => void, onStderr: (chunk: string) => void, 
    getStdin?: ((stdin: Stream.Writable) => void),
    encoding: BufferEncoding = 'ascii',
    kill = defaultKill,
): Promise<number> {
    console.log(`spawning command ${command} with args [${args}]`);
    const child = spawn(command, args, options);
    let timeoutKill = null;
    if (options.timeout !== undefined) {
        timeoutKill = setTimeout(async () => {
            console.log(`warning: killing process ${command} with args [${args}] due to timeout`);
            if (!await kill(child)) {
                throw new Error(`error killing ${command} with args [${args}]`);
            }
        }, options.timeout);
    }
    child.stdin.setDefaultEncoding(encoding);
    child.stdout.setEncoding(encoding);
    child.stderr.setEncoding(encoding);
    if (getStdin !== undefined) {
        getStdin(child.stdin);
    }
    child.stdout.on('data', onStdout);
    child.stderr.on('data', onStderr);
    child.stdin.on('error', (error) => {
        throw new Error(`error writing stdin: ${error.message}`);
    });
    child.stdout.on('error', (error) => {
        throw new Error(`error reading stdout: ${error.message}`);
    });
    child.stderr.on('error', (error) => {
        throw new Error(`error reading stderr: ${error.message}`);
    });
    return new Promise((resolve, reject) => {
        child.on('close', (code) => {
            console.log(`command ${command} with args [${args}] closed with code ${code}`);
            if (timeoutKill !== null) {
                clearTimeout(timeoutKill);
            }
            resolve(code!);
        });
        child.on('error', (error) => {
            if (timeoutKill !== null) {
                clearTimeout(timeoutKill);
            }
            reject(new Error(`error running ${command} with args [${args}]: ${error.message}`));
        });
    });
}

async function runForResult(command: string, args: string[], options: SpawnOptionsWithoutStdio, encoding: BufferEncoding): Promise<RunResult> {
    let output = '';
    const writeOutput = (data: string) => {
        output += data;
    }
    return runOnOutput(command, args, options, writeOutput, writeOutput, undefined, encoding).then((exitCode) => {
        return new RunResult(output, exitCode);
    });
}

// const keyDir = await createTempDirectory(key);
//         const luFilePath = path.join(keyDir, `temp.lu`);
//         const cFilePath = path.join(keyDir, `temp.c`);

export default class LuService {
    private tmp: TempFileService;

    constructor() {
        this.tmp = new TempFileService();
    }

    public async writeFile(key: string, file: string, content: string, encoding: BufferEncoding): Promise<void> {
        const path = this.tmp.getPath(key, file);
        return fs.writeFile(path, content, encoding);
    }

    public async readFile(key: string, file: string, encoding: BufferEncoding): Promise<string> {
        const path = this.tmp.getPath(key, file);
        return fs.readFile(path, encoding);
    }

    public async getKey(): Promise<string> {
        return this.tmp.createTempDirectory();
    }

    public async deleteKey(key: string): Promise<void> {
        return this.tmp.removeTempDirectory(key);
    }

    public async cleanup(): Promise<void> {
        return this.tmp.cleanup();
    }

    // Function to transpile Lu source code to C
    public async transpileLuToC(key: string, inFile: string, outFile: string, timeout: number): Promise<RunResult> {
        const main = path.resolve(`${config.luRoot}/src/main.py`);
        const cwd = this.tmp.getDir(key);
        return runForResult(
            'python3', [
                main, 
                '--input', inFile,
                '--output', outFile,
            ], 
            { timeout, cwd },
            'ascii'
        );
    }

    // Function to compile C source code to a binary
    // public async compileCToBinary(key: string, inFile: string, outFile: string, timeout: number): Promise<RunResult> {
    //     return runForResult(
    //         'gcc', [
    //             this.tmp.getPath(key, inFile),
    //             '-o', this.tmp.getPath(key, outFile)
    //         ], 
    //         { timeout }
    //     );
    // }

    // TODO: allow api to choose C compiler and flags etc.
    public async compileAndRun(
        key: string, inFile: string, args: string[], timeout: number,
        onStdout: (chunk: string) => void, onStderr?: ((chunk: string) => void),
        getStdin?: ((stdin: Stream.Writable) => void)
    ): Promise<ExitCode | null> {
        const dockerImage = 'gcc:latest' //'alpine:latest';
        const inPath = this.tmp.getPath(key, inFile);
        if (onStderr === undefined) {
            onStderr = onStdout;
        }
        // assert(existsSync(binaryPath), `Binary file ${binaryPath} does not exist`);
        // await runOnOutput(
        //     `ls`, ['-l', `${binaryPath}`], { timeout }, onStdout, onStderr);
        return runOnOutput(
            'docker', [
                'run',
                '-i',
                '--name', key,
                '--stop-timeout', '5',
                '-m', '10m', // 10mb memory limit
                '--rm',
                '--pull', 'missing',
                '--quiet',
                '-v', `${path.dirname(inPath)}/:/app/`, 
                '-w', '/app', 
                dockerImage, 
                'sh',
                '-c', `gcc -O2 -std=c99 -pedantic ${inFile} -o main && stdbuf -oL ./main ${quote(args)}`
            ], 
            { timeout }, 
            onStdout, onStderr, getStdin,
            'ascii',
            dockerKillName(key)
        );
    }
}
