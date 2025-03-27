import { Request, Response, NextFunction } from 'express';

async function post(req: Request, res: Response, next: NextFunction) {
    try {
        res.json({ message: 'Hello, Build!' });
    } catch (error) {
        console.error(error);
        next(error);
    }
}

export { post };