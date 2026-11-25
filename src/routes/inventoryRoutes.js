import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { getMyInventory, getMyEquippedItems, setItemEquipped, removeItemInstance } from '../controllers/inventoryController.js';

export const inventoryRouter = Router();

inventoryRouter.use(requireAuth);

inventoryRouter.get('/equipped', getMyEquippedItems);
inventoryRouter.get('/', getMyInventory);
inventoryRouter.patch('/:instanceId', setItemEquipped);
inventoryRouter.delete('/:instanceId', removeItemInstance);