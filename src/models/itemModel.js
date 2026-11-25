// Data access functions for the items table. No HTTP concerns — receives a
// `db` instance and returns plain data.

import { eq, and, ne, sql, asc } from 'drizzle-orm';
import { items } from '../db/schema.js';

/**
 * Find shop items, optionally filtered by type and/or theme, sorted by price
 * ascending. Legendary items have a null price (crate-only) — sorted to the
 * end rather than the SQLite default of sorting NULLs first, so this stays
 * correct even for queries that don't filter them out via purchasableOnly.
 * @param {object} db - Drizzle db instance.
 * @param {object} [filters] - { type, theme, purchasableOnly }
 * @returns {Promise<object[]>}
 */
export const findItems = async (db, filters = {}) => {
  const { type, theme, purchasableOnly } = filters;

  const conditions = [];
  if (type) conditions.push(eq(items.type, type));
  if (theme) conditions.push(eq(items.theme, theme));
  if (purchasableOnly) conditions.push(ne(items.rarity, 'legendary'));

  const priceAscNullsLast = [sql`${items.price} IS NULL`, asc(items.price)];

  if (conditions.length === 0) {
    return db.select().from(items).orderBy(...priceAscNullsLast);
  }
  return db
    .select()
    .from(items)
    .where(and(...conditions))
    .orderBy(...priceAscNullsLast);
};

export const findItemById = async (db, itemId) => {
  const result = await db.select().from(items).where(eq(items.itemId, itemId));
  return result[0];
};

export const findItemsByCrateId = async (db, crateId) => {
  return db.select().from(items).where(eq(items.crateId, crateId));
};
