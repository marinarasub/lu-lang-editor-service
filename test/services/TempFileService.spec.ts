import { expect } from 'chai';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import * as path from 'path';
import TempFileService, { KeyDoesNotExistError } from '../../src/services/TempFileService';

describe('TempFileService', () => {
    let tempFileService: TempFileService;

    beforeEach(async () => {
        tempFileService = new TempFileService();
    });

    afterEach(async () => {
        await tempFileService.cleanup();
    });

    it('should create and remove unique directories', async () => {
        const key1 = await tempFileService.createTempDirectory();
        const key2 = await tempFileService.createTempDirectory();
        expect(existsSync(tempFileService.getDir(key1))).to.be.true;
        expect(existsSync(tempFileService.getDir(key2))).to.be.true;
        await tempFileService.removeTempDirectory(key1);
        expect(() => existsSync(tempFileService.getDir(key1))).to.throw(KeyDoesNotExistError);
        expect(existsSync(tempFileService.getDir(key2))).to.be.true;
        await tempFileService.removeTempDirectory(key2);
        expect(() => existsSync(tempFileService.getDir(key1))).to.throw(KeyDoesNotExistError);
        expect(() => existsSync(tempFileService.getDir(key2))).to.throw(KeyDoesNotExistError);
        expect(key1).to.not.equal(key2);
    });

    it('should write and read a temporary file', async () => {
        const filename = 'test.txt';
        const content = 'Hello, world!';
        const key = await tempFileService.createTempDirectory();
        const filepath = path.join(tempFileService.getDir(key), filename)
        writeFileSync(filepath, content, 'utf8');
        const fileContent = readFileSync(filepath, 'utf8');
        expect(fileContent).to.equal(content);
        expect(() => tempFileService.removeTempDirectory(key)).to.not.throw();
    });
});
