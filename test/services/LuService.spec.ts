import { exec } from 'child_process';
import { expect } from 'chai';
import { describe, it } from 'mocha';
import { promisify } from 'util';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import TempFileService from '../../src/services/TempFileService';
import LuService from '../../src/services/LuService';
import { on } from 'events';

const execAsync = promisify(exec);

const C_HELLO_WORLD = `
#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}
`;

describe('C Program Compilation and Execution', () => {
    let lu: LuService;

    before(async () => {
        // Check if gcc is installed
        try {
            await execAsync('gcc --version');
        } catch (error) {
            throw new Error('gcc is not installed');
        }
        try {
            await execAsync('docker --version');
        } catch (error) {
            throw new Error('docker is not installed');
        }
        lu = new LuService();
    });

    after(async () => {
        await lu.cleanup();
    });

    it('should compile and run a simple C program', async () => {
        const key = await lu.getKey();
        await lu.writeFile(key, 'hello.c', C_HELLO_WORLD, 'ascii');
        let output = '';
        const onWrite = (data: string) => {
            output += data;
        };
        const code = await lu.compileAndRun(key, 'hello.c', 1000, onWrite);
        expect(output).to.equal('Hello, World!\n');
        expect(code).to.equal(0);
        lu.deleteKey(key);
    });
});
