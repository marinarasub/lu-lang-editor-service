import { promises as fs, existsSync, mkdirSync, realpathSync, rmSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

function getTempDirectory(): string {
    const basetmp: string = realpathSync(os.tmpdir());
    const tmp = path.join(basetmp, 'lu-lang-editor-service');
    return tmp;
}

class TempFileServiceError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'TempFileServiceError';
    }
}

export class KeyAlreadyExistsError extends TempFileServiceError {
    constructor(key: string) {
        super(`The key "${key}" already exists.`);
        this.name = 'KeyAlreadyExistsError';
    }
}

export class KeyDoesNotExistError extends TempFileServiceError {
    constructor(key: string) {
        super(`The key "${key}" does not exist.`);
        this.name = 'KeyDoesNotExistError';
    }
}

export default class TempFileService {
    private root: string;
    private tempKeys: Map<string, { directory: string; timestamp: number }>;

    constructor() {
        this.root = getTempDirectory();
        if (!existsSync(this.root)) {
            mkdirSync(this.root);
        }
        this.tempKeys = new Map();
    }

    public async cleanup(): Promise<void> {
        await fs.rm(this.root, { recursive: true });
    }

    private generateKey(): string {
        return uuidv4();
    }

    public async createTempDirectory(): Promise<string> {
        const key = this.generateKey();
        if (this.checkTempKey(key)) {
            throw new KeyAlreadyExistsError(key);
        }
        const keyDir = path.join(this.root, key);
        this.addTempKey(key, keyDir);
        return fs.mkdir(keyDir).then(() => key);
    }

    public async removeTempDirectory(key: string): Promise<void> {
        if (!this.checkTempKey(key)) {
            throw new KeyDoesNotExistError(key);
        }
        const keyDir = this.tempKeys.get(key)!.directory;
        this.tempKeys.delete(key);
        return fs.rm(keyDir, { recursive: true });
    }

    public getDir(key: string): string {
        if (!this.checkTempKey(key)) {
            throw new KeyDoesNotExistError(key);
        }
        return this.tempKeys.get(key)!.directory
    }

    public getPath(key: string, filename: string): string {
        return path.join(this.getDir(key), filename);
    }

    // public async writeTempFile(key: string, filename: string, content: string, encoding: BufferEncoding): Promise<void> {
    //     if (!this.checkTempKey(key)) {
    //         throw new KeyDoesNotExistError(key);
    //     }
    //     this.refreshTempKey(key);
    //     const keyDir = this.tempKeys.get(key)!.directory;
    //     return fs.writeFile(path.join(keyDir, filename), content, { encoding });
    // }

    // public async readTempFile(key: string, filename: string, encoding: BufferEncoding): Promise<string> {
    //     if (!this.checkTempKey(key)) {
    //         throw new KeyDoesNotExistError(key);
    //     }
    //     this.refreshTempKey(key);
    //     const keyDir = this.tempKeys.get(key)!.directory;
    //     return fs.readFile(path.join(keyDir, filename), { encoding });
    // }

    private checkTempKey(key: string): boolean {
        return this.tempKeys.has(key);
    }

    private addTempKey(key: string, directory: string): void {
        this.tempKeys.set(key, { directory, timestamp: Date.now() });
    }

    // private refreshTempKey(key: string): void {
    //     const entry = this.tempKeys.get(key);
    //     if (entry) {
    //         entry.timestamp = Date.now();
    //     }
    // }

    // private cleanupExpiredKeys(): void {
    //     console.log('Cleaning up expired tempdir keys');
    //     const now = Date.now();
    //     for (const key of Array.from(this.tempKeys.keys())) {
    //         const { timestamp } = this.tempKeys.get(key)!;
    //         if (now - timestamp > this.expirationTime) {
    //             this.removeTempDirectory(key).catch(() => {
    //                 console.log(`Failed to remove tempdir for key ${key}`);
    //             });
    //         }
    //     }
    // }
}

// On startup, clean up any leftover temp directories
try {
    rmSync(getTempDirectory(), { recursive: true });
} catch (error) {
    console.log("Couldn't clean tempdir on startup?");
}
