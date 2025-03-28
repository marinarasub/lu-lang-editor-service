import express from 'express';
import { validatePost, post } from '../../controllers/RunController';

const router = express.Router();

router.post('/', validatePost, post);

router.all('/', (req, res) => {
    res.status(405).json({ error: 'Method Not Allowed' });
});

export default router;