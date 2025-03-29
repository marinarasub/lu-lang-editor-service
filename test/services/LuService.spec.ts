import { exec, spawn } from 'child_process';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import { promisify } from 'util';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import TempFileService from '../../src/services/TempFileService';
import LuService from '../../src/services/LuService';
import { on } from 'events';
import { exitCode } from 'process';
import config from '../../src/constants/config';

const execAsync = promisify(exec);

const C_HELLO_WORLD = `
#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}
`;

async function isCommandOk(command: string, args: string[]): Promise<boolean> {
    const child = spawn(command, args, { stdio: 'inherit' });
    return new Promise((resolve, reject) => {
        child.on('close', (code) => {
            console.log(`Command ${command} with args [${args}] exited with code ${code}`);
            resolve(code! === 0);
        });
        child.on('error', (error) => {
            console.log(`Error running ${command} with args [${args}]: ${error.message}`);
            resolve(false);
        });
    });
}

describe('Program Compilation and Execution', () => {
    let lu: LuService;

    before(async () => {
        expect(await isCommandOk('gcc', ['--version'])).to.be.true;
        expect(await isCommandOk('docker', ['--version'])).to.be.true;
        expect(await isCommandOk('python3', [`${config.luRoot}/src/main.py`, '--version'])).to.be.true;
        lu = new LuService();
    });

    after(async () => {
        if (lu !== undefined) {
            await lu.cleanup();
        }
    });

    it('should transpile a lu program', async () => {
        const key = await lu.getKey();
        await lu.writeFile(key, 'hello.lu', '$print("Hello, World!\\n")', 'ascii');
        const result = await lu.transpileLuToC(key, 'hello.lu', 'hello.c', 1000);
        //expect(result.exitCode).to.equal(0);
        const cCode = await lu.readFile(key, 'hello.c', 'ascii');
        //console.log(cCode);
        
        // don't actually need to check correctness of cCode

        let output = '';
        const onWrite = (data: string) => {
            output += data;
        };
        const exitCode = await lu.compileAndRun(key, 'hello.c', [], 1000, onWrite);
        expect(output).to.equal('Hello, World!\n');
        expect(exitCode).to.equal(0);

        lu.deleteKey(key);
    });

    it('should compile and run a simple C program', async () => {
        const key = await lu.getKey();
        await lu.writeFile(key, 'hello.c', C_HELLO_WORLD, 'ascii');
        let output = '';
        const onWrite = (data: string) => {
            output += data;
        };
        const exitCode = await lu.compileAndRun(key, 'hello.c', [], 1000, onWrite);
        expect(output).to.equal('Hello, World!\n');
        expect(exitCode).to.equal(0);
        lu.deleteKey(key);
    });
});
