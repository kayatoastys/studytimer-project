import { db } from '../db/connection.js';
import { findAllCrates, findCrateById } from '../models/crateModel.js';
import { findItems, findItemById, findItemsByCrateId } from '../models/itemModel.js';
import { insertUserItem } from '../models/userItemModel.js';
import { decrementUserPoints, findUserById } from '../models/userModel.js';
import { rollItemFromPool } from '../utils/crateRoll.js';
import { AppError } from '../utils/_errors.js';

export const getAllCrates = async (req, res, next) => {
  try {
    const allCrates = await findAllCrates(db);
    res.status(200).json({ crates: allCrates });
  } catch (error) {
    next(error);
  }
};

export const getCrateById = async (req, res, next) => {
  try {
    const crateId = parseInt(req.params.id, 10);
    if (Number.isNaN(crateId)) {
      throw new AppError('VALIDATION_ERROR', 'Crate id must be a number');
    }

    const crate = await findCrateById(db, crateId);
    if (!crate) {
      throw new AppError('NOT_FOUND', 'Crate not found');
    }

    const pool = await findItemsByCrateId(db, crateId);

    res.status(200).json({ crate, pool });
  } catch (error) {
    next(error);
  }
};

export const getItems = async (req, res, next) => {
  try {
    const { type, theme, purchasable } = req.query;

    const filters = {
      type,
      theme,
      purchasableOnly: purchasable === 'true',
    };

    const filteredItems = await findItems(db, filters);

    res.status(200).json({ items: filteredItems });
  } catch (error) {
    next(error);
  }
};

export const getItemById = async (req, res, next) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    if (Number.isNaN(itemId)) {
      throw new AppError('VALIDATION_ERROR', 'Item id must be a number');
    }

    const item = await findItemById(db, itemId);
    if (!item) {
      throw new AppError('NOT_FOUND', 'Item not found');
    }

    res.status(200).json({ item });
  } catch (error) {
    next(error);
  }
};

export const openCrate = async (req, res, next) => {
  try {
    const crateId = parseInt(req.params.id, 10);
    if (Number.isNaN(crateId)) {
      throw new AppError('VALIDATION_ERROR', 'Crate id must be a number');
    }

    const { userId } = req.user;

    const crate = await findCrateById(db, crateId);
    if (!crate) {
      throw new AppError('NOT_FOUND', 'Crate not found');
    }

    const user = await findUserById(db, userId);
    if (user.totalPoints < crate.price) {
      throw new AppError('VALIDATION_ERROR', `Not enough points. This crate costs ${crate.price}, you have ${user.totalPoints}.`);
    }

    const pool = await findItemsByCrateId(db, crateId);
    if (pool.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'This crate has no items configured yet');
    }

    const wonItem = rollItemFromPool(pool);

    const updatedUser = await decrementUserPoints(db, userId, crate.price);

    const newInstance = await insertUserItem(db, {
      userId,
      itemId: wonItem.itemId,
      acquiredVia: 'crate',
      acquiredAt: Date.now(),
    });

    res.status(201).json({
      wonItem,
      instance: newInstance,
      totalPoints: updatedUser.totalPoints,
    });
  } catch (error) {
    next(error);
  }
};

export const purchaseItem = async (req, res, next) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    if (Number.isNaN(itemId)) {
      throw new AppError('VALIDATION_ERROR', 'Item id must be a number');
    }

    const { userId } = req.user;

    const item = await findItemById(db, itemId);
    if (!item) {
      throw new AppError('NOT_FOUND', 'Item not found');
    }

    if (item.rarity === 'legendary' || item.price === null) {
      throw new AppError('VALIDATION_ERROR', 'Legendary items can only be obtained from crates, not purchased directly');
    }

    const user = await findUserById(db, userId);
    if (user.totalPoints < item.price) {
      throw new AppError('VALIDATION_ERROR', `Not enough points. This item costs ${item.price}, you have ${user.totalPoints}.`);
    }

    const updatedUser = await decrementUserPoints(db, userId, item.price);

    const newInstance = await insertUserItem(db, {
      userId,
      itemId: item.itemId,
      acquiredVia: 'shop',
      acquiredAt: Date.now(),
    });

    res.status(201).json({
      item,
      instance: newInstance,
      totalPoints: updatedUser.totalPoints,
    });
  } catch (error) {
    next(error);
  }
};