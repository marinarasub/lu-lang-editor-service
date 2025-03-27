import express, { Request, Response } from "express";
import { post } from "../controllers/BuildController";

const router = express.Router();

router.post('/', post);

export default router;
