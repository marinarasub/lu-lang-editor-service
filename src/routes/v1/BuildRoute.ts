import express, { Request, Response } from "express";
import { post, validatePost } from "../../controllers/BuildController";

const router = express.Router();

router.post('/', validatePost, post);

router.all('/', (req, res) => {
    res.status(405).json({ error: 'Method Not Allowed' });
});

export default router;
