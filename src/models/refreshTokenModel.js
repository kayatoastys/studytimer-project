// Data access functions for the refresh_tokens table. No HTTP concerns —
// receives a `db` instance and returns plain data.

import { eq } from 'drizzle-orm';
import { refreshTokens } from '../db/schema.js';

/**
 * Insert a new refresh token row.
 * @param {object} db - Drizzle db instance.
 * @param {object} newToken - { tokenId, userId, expiresAt, createdAt }
 * @returns {Promise<object>} The inserted row.
 */
export const insertRefreshToken = async (db, newToken) => {
  const result = await db.insert(refreshTokens).values(newToken).returning();
  return result[0];
};

/**
 * Find a refresh token by its ID. Returns undefined if it doesn't exist —
 * callers must separately check expiresAt, since an expired-but-not-yet-
 * deleted row is still "found" here.
 * @param {object} db - Drizzle db instance.
 * @param {string} tokenId
 * @returns {Promise<object|undefined>}
 */
export const findRefreshTokenById = async (db, tokenId) => {
  const result = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenId, tokenId));
  return result[0];
};

/**
 * Permanently delete a refresh token — used on logout and on rotation
 * (deleting the old token as soon as a new one is issued from it), so a
 * stolen refresh token stops working the moment the real user refreshes.
 * @param {object} db - Drizzle db instance.
 * @param {string} tokenId
 * @returns {Promise<void>}
 */
export const deleteRefreshTokenById = async (db, tokenId) => {
  await db.delete(refreshTokens).where(eq(refreshTokens.tokenId, tokenId));
};