import config from "./src/constants/config";
import server from "./src/Server";
import { AddressInfo } from "net";
import path from "path";
import { existsSync } from 'fs';

server.listen(config.port, () => {
    const address = server.address()! as AddressInfo;
    const host = address.address === '::' ? 'localhost' : address.address;
    const port = address.port;
    console.log(`server running at ${host}:${port} (config: ${config.host}:${config.port})`);
    console.log(`frontend url: ${config.frontendUrl}`);
    console.log(`full working directory: ${path.resolve(process.cwd())}`);
    console.log(`full lu root path: ${path.resolve(config.luRoot)}`);
    existsSync(config.luRoot) ? console.log('lu root exists') : console.log('lu root does not exist');
    existsSync(config.luRoot + '/src/main.py') ? console.log('lu main.py exists') : console.log('lu main.py does not exist');
});
