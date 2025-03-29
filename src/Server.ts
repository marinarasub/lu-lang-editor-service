import http, { Server } from 'http';
import app from './App';
import { Duplex } from 'stream';
import url from 'url';
import { wsServer as runWsServer } from './controllers/RunController';
import { IncomingMessage } from 'http';

// const httpsOptions = {
//     key: fs.readFileSync('certs/server.key'),
//     cert: fs.readFileSync('certs/server.crt'),
// };

const server: Server = http.createServer(app)!;

const wsUpgrade = (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const { pathname } = url.parse(request.url!, false);
  
    if (pathname === '/run') {
        runWsServer.handleUpgrade(request, socket, head, (ws) => {
            runWsServer.emit('connection', ws, request);
        });
    } else {
      socket.destroy();
    }
  }

server.on('upgrade', wsUpgrade);

export default server;