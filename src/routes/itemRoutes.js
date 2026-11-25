import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { getItems, getItemById, purchaseItem } from '../controllers/shopController.js';

export const itemRouter = Router();

itemRouter.get('/', getItems);
itemRouter.get('/:id', getItemById);
itemRouter.post('/:id/purchase', requireAuth, purchaseItem);