import config from "./constants/config";
import server from "./Server";
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
    if (!existsSync(config.luRoot)) {
        console.log('warning: lu root does not exist');
    }
    if (!existsSync(config.luRoot + '/src/main.py')) {
        console.log('warning: lu main.py does not exist');
    }
});
