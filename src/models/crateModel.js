// Data access functions for the crates table. No HTTP concerns — receives a
// `db` instance and returns plain data.

import { eq } from 'drizzle-orm';
import { crates } from '../db/schema.js';

/**
 * Find all crates in the catalog.
 * @param {object} db - Drizzle db instance.
 * @returns {Promise<object[]>}
 */
export const findAllCrates = async (db) => {
  return db.select().from(crates);
};

/**
 * Find a single crate by its crate_id. Returns undefined if no match.
 * @param {object} db - Drizzle db instance.
 * @param {number} crateId
 * @returns {Promise<object|undefined>}
 */
export const findCrateById = async (db, crateId) => {
  const result = await db.select().from(crates).where(eq(crates.crateId, crateId));
  return result[0];
};