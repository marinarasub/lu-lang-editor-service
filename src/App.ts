import express from 'express';

const app = express();
const port = 3000;

app.use(express.json());

import runRoute from './routes/RunRoute';
import buildRoute from './routes/BuildRoute';

app.use('/run', runRoute);
app.use('/build', buildRoute);

app.get('/', (req, res) => {
    res.send('Hello, TypeScript with Express!');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

export default app;