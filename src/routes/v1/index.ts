import express from 'express';
import BuildRoute from './BuildRoute';
import RunRoute from './RunRoute';

const v1 = express.Router();

v1.all('/', (req, res) => {
    res.status(405).json({ error: 'Method Not Allowed' });
});

v1.get('/version', (req, res) => {
    res.json({ version: '0.1.0', message: 'API Version 1' });
});

v1.all('/version', (req, res) => {
    res.status(405).json({ error: 'Method Not Allowed' });
});

v1.use('/build', BuildRoute);
v1.use('/run', RunRoute);

export default v1;