import { Request, Response, NextFunction } from 'express';
import { body, ValidationError, validationResult } from 'express-validator';
import { lu } from './services';
import { WebSocket } from 'ws';
import url from 'url';
import Stream from 'stream';
import { IncomingMessage } from 'http';
import config from '../constants/config';

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
    body("args").optional().isArray().withMessage("args must be an array"),
    body("args.*").isString().withMessage("args must be an array of strings"),
];

interface Connection {
    onConnect: (ws: WebSocket) => void;
    onSend: (data: string) => void;
    onReceive: (data: string) => void;
    onExit: (exitCode: number) => void;
    onAbort: () => void;
    onErr: (error: Error) => void;
}

// 10kb max
const DEFAULT_LIMIT = 10 * 1024;

class RunConnection {
    private id: string;
    private ws: WebSocket | null;
    private stdin: Stream.Writable | null;
    private inBuf: string;
    private outBuf: string;
    private limitIn: number;
    private limitOut: number;
    private bytesIn: number;
    private bytesOut: number;
    private exitCode: number | null;
    private onClose: (conn: RunConnection) => void;

    constructor(
        id: string,
        onClose: (conn: RunConnection) => void,
        limitIn: number = DEFAULT_LIMIT,
        limitOut: number = DEFAULT_LIMIT
    ) {
        this.id = id;
        this.onClose = onClose;
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
        this.onClose(this);
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

    onReceive(data: string) {
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

    onAbort() {
        this.exitCode = -1;
        this.outBuf += '\n[process was aborted]\n';
        if (this.ws !== null) {
            this.ws.send(this.outBuf);
            this.close();
        } else {
            // after process is killed, wait a bit in case the client hasn't connected yet
            setTimeout(() => {
                this.close();
            }, config.wsTimeout);
        }
    }

    onExit(exitCode: number) {
        this.exitCode = exitCode;
        this.outBuf += `\n[process exited with code ${exitCode}]\n`;
        if (this.ws !== null) {
            this.ws.send(this.outBuf);
            this.close();
        } else {
            // after process exits, wait a bit in case the client hasn't connected yet
            setTimeout(() => {
                this.close();
            }, config.wsTimeout);
        }
    }

    onErr(error: Error) {
        this.outBuf += `\n[run failed]: ${error.message}\n`;
        if (this.ws !== null) {
            this.ws.send(this.outBuf);
            this.close();
        } else {
            // after error starting process, wait a bit in case the client hasn't connected yet
            setTimeout(() => {
                this.close();
            }, config.wsTimeout);
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
        connection.onReceive(message.toString());
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
    const connection = new RunConnection(
        key
    , () => {
        connections.delete(key);
    });
    connections.set(key, connection);
    try {
        await lu.writeFile(key, 'main.c', req.body.input, 'ascii');
        
        res.status(201).json(makeSuccessResponse(key));

        const onWrite = (data: string) => {
            connection.onSend(data);
        };
        const getStdin = (stdin: Stream.Writable) => {
            connection.setStdin(stdin);
        }
        const args = req.body.args || [];
        const exitCode = await lu.compileAndRun(key, 'main.c', args, config.runTimeout, config.runMaxMemoryMb, onWrite, onWrite, getStdin);
        if (exitCode === null) {
            connection.onAbort();
        }
        else {
            connection.onExit(exitCode);
        }
        lu.deleteKey(key);
    } catch (error) {
        connection.onErr(error instanceof Error ? error : new Error('an unknown error occurred'));
        lu.deleteKey(key);
        next(error);
    }
}

export { validatePost, post, wsServer };
