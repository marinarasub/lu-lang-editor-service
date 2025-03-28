import { spawn, SpawnOptionsWithoutStdio } from 'child_process';
import * as path from 'path';
import TempFileService from './TempFileService';
import { existsSync, promises as fs } from 'fs';
import { on } from 'events';
import { assert } from 'console';
import e from 'express';
import Stream from 'stream';

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

    public success(): Boolean {
        return this.exitCode === 0;
    }
}

async function runOnOutput(
    command: string, args: string[], options: SpawnOptionsWithoutStdio,
    onStdout: (chunk: string) => void, onStderr: (chunk: string) => void, 
    getStdin?: ((stdin: Stream.Writable) => void),
    encoding: BufferEncoding = 'ascii'
): Promise<number> {
    const child = spawn(command, args, options);
    child.stdin.setDefaultEncoding(encoding);
    child.stdout.setEncoding(encoding);
    child.stderr.setEncoding(encoding);
    if (getStdin !== undefined) {
        getStdin(child.stdin);
    }
    child.stdout.on('data', onStdout);
    child.stderr.on('data', onStderr);
    child.stdout.on('error', (error) => {
        throw new Error(`error reading stdout: ${error.message}`);
    });
    child.stderr.on('error', (error) => {
        throw new Error(`error reading stderr: ${error.message}`);
    });
    return new Promise((resolve, reject) => {
        child.on('close', (code) => {
            resolve(code!);
        });
        child.on('error', (error) => {
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


function expandHomeDir(filePath: string): string {
    if (filePath.startsWith('~')) {
        const homeDir = process.env.HOME || '';
        return path.join(homeDir, filePath.slice(1));
    }
    return filePath;
}
export const LU_PY_PATH = expandHomeDir('~/repos/lu-lang-py/src/main.py');
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
        return runForResult(
            'python3', [
                LU_PY_PATH, 
                '--input', this.tmp.getPath(key, inFile),
                '--output', this.tmp.getPath(key, outFile)
            ], 
            { timeout },
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

    // Function to execute a binary and stream its output
    public async compileAndRun(
        key: string, inFile: string, timeout: number,
        onStdout: (chunk: string) => void, onStderr?: ((chunk: string) => void),
        getStdin?: ((stdin: Stream.Writable) => void)
    ): Promise<ExitCode> {
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
                '--rm',
                '--pull', 'missing',
                '--quiet',
                '-v', `${path.dirname(inPath)}/:/app/`, 
                '-w', '/app', 
                dockerImage, 
                'sh',
                '-c', `gcc -O2 -std=c99 -pedantic ${inFile} -o main; ./main`
            ], 
            { timeout }, 
            onStdout, onStderr, getStdin,
            'ascii'
        );
    }
}