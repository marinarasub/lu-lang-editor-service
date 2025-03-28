import httpsServer from "./Server";

const port = 3000;

httpsServer.listen(port, () => {
    console.log(`HTTPS server running on port ${port}`);
});
