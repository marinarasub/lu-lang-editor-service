import { Request, Response, NextFunction } from 'express';
import { body, ValidationError, validationResult } from 'express-validator';
import { lu } from './services';
import { WebSocket } from 'ws';
import url from 'url';
import Stream from 'stream';
import { IncomingMessage } from 'http';

// req body should look like
// {
//     "input": "string"
// }

function makeResponse(id: string, errors: string[]) {
    return {
        id: id,
        errors: errors,
    };
}

function makeSuccessResponse(id: string) {
    return makeResponse(id, []);
}

function makeErrorResponse(errors: string[]) {
    return makeResponse('', errors);
}

const validatePost = [
    body("input").isString().isLength({ min: 1 }).withMessage("input must be a non-empty string"),
];

interface Connection {
    onConnect: (ws: WebSocket) => void;
    onSend: (data: string) => void;
    onRecieve: (data: string) => void;
    onEnd: (exitCode: number) => void;
}

// 10kb max
const DEFAULT_LIMIT = 10 * 1024;

class RunConnection {
    private ws: WebSocket | null;
    private stdin: Stream.Writable | null;
    private inBuf: string;
    private outBuf: string;
    private limitIn: number;
    private limitOut: number;
    private bytesIn: number;
    private bytesOut: number;
    private exitCode: number | null;

    constructor(limitIn: number = DEFAULT_LIMIT, limitOut: number = DEFAULT_LIMIT) {
        this.ws = null;
        this.stdin = null;
        this.inBuf = '';
        this.outBuf = '';
        this.limitIn = limitIn;
        this.limitOut = limitOut;
        this.bytesIn = 0;
        this.bytesOut = 0;
        this.exitCode = null;
    }

    private close() {
        if (this.ws !== null) {
            this.ws.close();
            this.ws = null;
        }
    }

    setStdin(stdin: Stream.Writable) {
        this.stdin = stdin;
    }

    onConnect(ws: WebSocket) {
        this.ws = ws;
        if (this.outBuf.length > 0) {
            ws.send(this.outBuf);
            this.outBuf = '';
        }
        // if already finished, just close it.
        if (this.exitCode !== null) {
            this.close();
        }
    }

    onSend(data: string) {
        this.outBuf += data;
        this.bytesOut += data.length;
        // TODO: if too much data, break connection
        if (this.ws !== null) {
            this.ws.send(this.outBuf);
            this.outBuf = '';
        }
        if (this.bytesOut > this.limitOut) {
            this.ws?.send('\n[output limit exceeded]\n');
            this.close();
        }
    }

    onRecieve(data: string) {
        this.inBuf += data;
        this.bytesIn += data.length;
        if (this.stdin !== null) {
            this.stdin.write(data);
            this.inBuf = '';   
        }
        if (this.bytesIn > this.limitIn) {
            this.ws?.send('\n[input limit exceeded]\n');
            this.close();
        }
    }

    onEnd(exitCode: number) {
        this.exitCode = exitCode;
        this.outBuf += `\n[process exited with code ${exitCode}]\n`;
        if (this.ws !== null) {
            if (this.outBuf.length > 0) {
                this.ws.send(this.outBuf);
            }
            this.close();
        }
    }
}

const connections = new Map<string, Connection>();

const wsServer = new WebSocket.Server({ noServer: true });

wsServer.on('connection', (ws: WebSocket, request: IncomingMessage) => {
    const clientAddress = request.socket.remoteAddress || 'unknown';
    console.log(`ws client connected from ${clientAddress}`);

    const params = url.parse(request.url!, true).query;
    const id = params.id;
    if (typeof id !== 'string' || !connections.has(id)) {
        ws.close();
        return;
    }

    const connection = connections.get(id)!;
    connection.onConnect(ws);

    ws.on('message', (message) => {
        connection.onRecieve(message.toString());
    });

    ws.on('close', () => {
        connections.delete(id);
    });    
});

async function post(req: Request, res: Response, next: NextFunction) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json(
            makeErrorResponse(errors.array().map((e: ValidationError) => {
                return e.msg;
            }))
        );
        return;
    }

    const key = await lu.getKey();
    try {
        await lu.writeFile(key, 'main.c', req.body.input, 'ascii');
        const connection = new RunConnection();
        connections.set(key, connection);

        res.status(201).json(makeSuccessResponse(key));

        const onWrite = (data: string) => {
            connection.onSend(data);
        };
        const getStdin = (stdin: Stream.Writable) => {
            connection.setStdin(stdin);
        }
        const exitCode = await lu.compileAndRun(key, 'main.c', 10000, onWrite, onWrite, getStdin);
        connection.onEnd(exitCode);
        lu.deleteKey(key);
    } catch (error) {
        lu.deleteKey(key);
        next(error);
    }
}

export { validatePost, post, wsServer };
