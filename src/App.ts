import express from 'express';
import api from './routes/VersionRoute';

const app = express();

app.use(express.json());

app.use('/api', api);
app.use('/', api);

app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

export default app;