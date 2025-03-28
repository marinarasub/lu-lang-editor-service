import https from 'https';
import * as fs from 'fs';
import app from './App';
import WebSocket from 'ws';
import { Duplex } from 'stream';
import url from 'url';
import { wsServer as runWsServer } from './controllers/RunController';
import { IncomingMessage } from 'http';

const httpsOptions = {
    key: fs.readFileSync('certs/server.key'),
    cert: fs.readFileSync('certs/server.crt'),
};

const httpsServer = https.createServer(httpsOptions, app);

httpsServer.on('upgrade', (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const { pathname } = url.parse(request.url!, false);
  
    if (pathname === '/run') {
        runWsServer.handleUpgrade(request, socket, head, (ws) => {
            runWsServer.emit('connection', ws, request);
        });
    } else {
      socket.destroy();
    }
  }
);

export default httpsServer;