// Data access functions for the sessions table. No HTTP concerns — receives a
// `db` instance and returns plain data.

import { eq, desc } from 'drizzle-orm';
import { sessions } from '../db/schema.js';

/**
 * Insert a new completed session row.
 * @param {object} db - Drizzle db instance.
 * @param {object} newSession - { userId, mode, sessionType, durationSeconds, pointsEarned, startedAt, completedAt }
 * @returns {Promise<object>} The inserted session row.
 */
export const insertSession = async (db, newSession) => {
  const result = await db.insert(sessions).values(newSession).returning();
  return result[0];
};

/**
 * Find a single session by its session_id. Returns undefined if no match.
 * @param {object} db - Drizzle db instance.
 * @param {number} sessionId
 * @returns {Promise<object|undefined>}
 */
export const findSessionById = async (db, sessionId) => {
  const result = await db.select().from(sessions).where(eq(sessions.sessionId, sessionId));
  return result[0];
};

/**
 * Find all sessions belonging to a user, most recent first. Filtering is done
 * at the database level (WHERE user_id) rather than fetching everything and
 * filtering in the controller.
 * @param {object} db - Drizzle db instance.
 * @param {string} userId
 * @param {number} [limit] - Optional cap on number of rows returned.
 * @returns {Promise<object[]>}
 */
export const findSessionsByUserId = async (db, userId, limit) => {
  const query = db.select().from(sessions).where(eq(sessions.userId, userId)).orderBy(desc(sessions.startedAt));

  if (limit) {
    return query.limit(limit);
  }
  return query;
};