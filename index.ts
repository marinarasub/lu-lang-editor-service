import config from "./src/constants/config";
import server from "./src/Server";
import { AddressInfo } from "net";

server.listen(config.port, () => {
    const address = server.address()! as AddressInfo;
    const host = address.address === '::' ? 'localhost' : address.address;
    const port = address.port;
    console.log(`server running at ${host}:${port} (config: ${config.host}:${config.port})`);
});
