import { db } from '../db/connection.js';
import {
  findUserItemsWithDetailsByUserId,
  findUserItemById,
  findEquippedItemByType,
  unequipAllOfTypeForUser,
  setInstanceEquipped,
  deleteUserItem,
} from '../models/userItemModel.js';
import { AppError } from '../utils/_errors.js';

export const getMyInventory = async (req, res, next) => {
  try {
    const inventory = await findUserItemsWithDetailsByUserId(db, req.user.userId);
    res.status(200).json({ inventory });
  } catch (error) {
    next(error);
  }
};

export const getMyEquippedItems = async (req, res, next) => {
  try {
    const [character, background] = await Promise.all([
      findEquippedItemByType(db, req.user.userId, 'character'),
      findEquippedItemByType(db, req.user.userId, 'background'),
    ]);

    res.status(200).json({
      character: character || null,
      background: background || null,
    });
  } catch (error) {
    next(error);
  }
};

export const setItemEquipped = async (req, res, next) => {
  try {
    const instanceId = parseInt(req.params.instanceId, 10);
    if (Number.isNaN(instanceId)) {
      throw new AppError('VALIDATION_ERROR', 'Instance id must be a number');
    }

    const { equipped } = req.body;
    if (typeof equipped !== 'boolean') {
      throw new AppError('VALIDATION_ERROR', 'equipped must be true or false');
    }

    const instance = await findUserItemById(db, instanceId);
    if (!instance) {
      throw new AppError('NOT_FOUND', 'Item instance not found');
    }

    if (instance.userId !== req.user.userId) {
      throw new AppError('FORBIDDEN', 'You do not own this item');
    }

    if (equipped) {
      await unequipAllOfTypeForUser(db, req.user.userId, instance.itemType);
    }

    const updatedInstance = await setInstanceEquipped(db, instanceId, equipped);

    res.status(200).json({ instance: updatedInstance });
  } catch (error) {
    next(error);
  }
};

export const removeItemInstance = async (req, res, next) => {
  try {
    const instanceId = parseInt(req.params.instanceId, 10);
    if (Number.isNaN(instanceId)) {
      throw new AppError('VALIDATION_ERROR', 'Instance id must be a number');
    }

    const instance = await findUserItemById(db, instanceId);
    if (!instance) {
      throw new AppError('NOT_FOUND', 'Item instance not found');
    }

    if (instance.userId !== req.user.userId) {
      throw new AppError('FORBIDDEN', 'You do not own this item');
    }

    await deleteUserItem(db, instanceId);

    res.status(200).json({ message: 'Item removed', instanceId });
  } catch (error) {
    next(error);
  }
};