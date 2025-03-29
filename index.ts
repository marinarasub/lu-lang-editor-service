import config from "./src/constants/config";
import server from "./src/Server";
import { AddressInfo } from "net";
import path from "path";

server.listen(config.port, () => {
    const address = server.address()! as AddressInfo;
    const host = address.address === '::' ? 'localhost' : address.address;
    const port = address.port;
    console.log(`server running at ${host}:${port} (config: ${config.host}:${config.port})`);
    console.log(`full working directory: ${path.resolve(process.cwd())}`);
    console.log(`full lu root path: ${path.resolve(config.luRoot)}`);
});
