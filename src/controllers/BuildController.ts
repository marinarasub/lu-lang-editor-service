import { Request, Response, NextFunction } from 'express';
import { lu } from './services';
import { error, time } from 'console';
import { success } from '../services/LuService';
import { body, ValidationError, validationResult } from 'express-validator';

// req body should look like
// {
//     "input": "string"
// }

function makeResponse(id: string, exitCode: number, output: string, build: string, timeMs: number, errors: string[]) {
    return {
        id: id,
        result: {
            code: exitCode,
            output: output,
            build: build,
            time: timeMs,
            success: exitCode === 0,
        },
        errors: errors,
    };
}

function makeSuccessResponse(id: string, exitCode: number, output: string, build: string, timeMs: number) {
    return makeResponse(id, exitCode, output, build, timeMs, []);
}

function makeErrorResponse(errors: string[]) {
    return makeResponse('', -1, '', '', -1, errors);
}

const validatePost = [
    body("input").isString().isLength({ min: 1 }).withMessage("input must be a non-empty string"),
];

async function post(req: Request, res: Response, next: NextFunction) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json(
            makeErrorResponse(errors.array().map((e: ValidationError) => {
                return e.msg;
            }))
        );
        return;
    }

    const key = await lu.getKey();
    try {
        await lu.writeFile(key, 'input.lu', req.body.input, 'ascii');
        const result = await lu.transpileLuToC(key, 'input.lu', 'output.c', 5000);
        if (result.exitCode !== 0) {
            lu.deleteKey(key);
            res.status(201).json(makeSuccessResponse(key, result.exitCode, result.output, '', -1));
        } else {
            const build = await lu.readFile(key, 'output.c', 'ascii');
            lu.deleteKey(key);
            res.status(201).json(makeSuccessResponse(key, result.exitCode, result.output, build, -1));
        }
    } catch (error) {
        lu.deleteKey(key);
        next(error);
    }
}

export { validatePost,  post };