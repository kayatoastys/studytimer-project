import { eq, desc, sql } from 'drizzle-orm';
import { users, sessions } from '../db/schema.js';
export const findUserByUsername = async (db, username) => {
  const result = await db.select().from(users).where(eq(users.username, username));
  return result[0];
};

export const findUserById = async (db, userId) => {
  const result = await db.select().from(users).where(eq(users.userId, userId));
  return result[0];
};

export const insertUser = async (db, newUser) => {
  const result = await db.insert(users).values(newUser).returning();
  return result[0];
};

export const updateUserAvatar = async (db, userId, updates) => {
  const result = await db.update(users).set(updates).where(eq(users.userId, userId)).returning();
  return result[0];
};

export const incrementUserPoints = async (db, userId, pointsToAdd) => {
  const user = await findUserById(db, userId);
  if (!user) return undefined;

  const result = await db
    .update(users)
    .set({ totalPoints: user.totalPoints + pointsToAdd })
    .where(eq(users.userId, userId))
    .returning();
  return result[0];
};

export const decrementUserPoints = async (db, userId, pointsToDeduct) => {
  const user = await findUserById(db, userId);
  if (!user) return undefined;

  const result = await db
    .update(users)
    .set({ totalPoints: user.totalPoints - pointsToDeduct })
    .where(eq(users.userId, userId))
    .returning();
  return result[0];
};

/**
 * Find the top N users ranked by lifetime accumulated points — the sum of
 * every focus session's pointsEarned, ever. This is deliberately different
 * from `totalPoints` (the current spendable balance), which goes DOWN when a
 * user buys crates/items. A leaderboard ranked by spendable balance would
 * unfairly penalize active shoppers, so this ranks by total points ever
 * earned instead, which never decreases. Computed via a database-level SUM
 * rather than fetching every user's full session history to sum in JS.
 * @param {object} db - Drizzle db instance.
 * @param {number} limit
 * @returns {Promise<object[]>}
 */
export const findTopUsersByAccumulatedPoints = async (db, limit) => {
  const accumulatedExpr = sql`COALESCE(SUM(CASE WHEN ${sessions.sessionType} = 'focus' THEN ${sessions.pointsEarned} ELSE 0 END), 0)`;

  return db
    .select({
      userId: users.userId,
      username: users.username,
      avatarEyes: users.avatarEyes,
      avatarMouth: users.avatarMouth,
      accumulatedPoints: accumulatedExpr,
    })
    .from(users)
    .leftJoin(sessions, eq(sessions.userId, users.userId))
    .groupBy(users.userId)
    .orderBy(desc(accumulatedExpr))
    .limit(limit);
};