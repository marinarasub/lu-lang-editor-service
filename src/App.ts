import express from 'express';
import api from './routes/VersionRoute';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

const app = express();

app.use(express.json());

if (process.env.NODE_ENV === 'development') {
    const corsOptions = {
        origin: 'http://localhost:5000',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
    };
    app.use(cors(corsOptions));
}

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