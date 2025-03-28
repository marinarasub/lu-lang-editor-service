import express from 'express';
import https from 'https';
import * as fs from 'fs';
import api from './routes/VersionRoute';

const app = express();
const port = 3000;

app.use(express.json());

app.use('/api', api);
app.use('/', api);

app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

const httpsOptions = {
    key: fs.readFileSync('certs/server.key'),
    cert: fs.readFileSync('certs/server.crt'),
};

https.createServer(httpsOptions, app).listen(port, () => {
    console.log(`HTTPS server running on port ${port}`);
});

export default app;