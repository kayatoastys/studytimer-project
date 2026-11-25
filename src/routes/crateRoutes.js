import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { getAllCrates, getCrateById, openCrate } from '../controllers/shopController.js';

export const crateRouter = Router();

crateRouter.get('/', getAllCrates);
crateRouter.get('/:id', getCrateById);
crateRouter.post('/:id/open', requireAuth, openCrate);