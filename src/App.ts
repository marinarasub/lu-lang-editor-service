import express from 'express';
import api from './routes/VersionRoute';
import rateLimit from 'express-rate-limit';

const app = express();

app.use(express.json());

const limiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 100
});

app.use(limiter);

app.use('/api', api);
app.use('/', api);

app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

export default app;