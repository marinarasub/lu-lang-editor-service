import express from 'express';
import api from './routes/VersionRoute';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import config from './constants/config';

const app = express();

app.use(express.json());

if (process.env.NODE_ENV === 'development') {
    // frontend cors for development
    const corsOptions = {
        origin: 'http://localhost:5001',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
    };
    app.use(cors(corsOptions));
}

const limiter = rateLimit({
    windowMs: config.rateLimitWindow,
    max: config.rateLimitWindowMax,
    message: { error: 'Rate Limit Exceeded' },
});

app.use(limiter);

app.use('/api', api);
app.use('/', api);

app.use((req, res) => {
    res.status(404).json({ error: 'Not Found' });
});

export default app;