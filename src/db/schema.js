// All table schemas live here — single source of truth for the database structure.
// After adding/changing a table, run `npm run db` to recreate the database.

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  userId: text('user_id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  totalPoints: integer('total_points').notNull().default(0),
  avatarEyes: text('avatar_eyes').notNull().default('round'),
  avatarMouth: text('avatar_mouth').notNull().default('smile'),
  createdAt: integer('created_at').notNull(),
});

export const sessions = sqliteTable('sessions', {
  sessionId: integer('session_id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.userId, { onDelete: 'cascade' }),
  mode: text('mode').notNull(),
  sessionType: text('session_type').notNull(),
  sessionName: text('session_name'), // free-text user label, nullable — always rendered via textContent, never innerHTML
  durationSeconds: integer('duration_seconds').notNull(),
  pointsEarned: integer('points_earned').notNull().default(0),
  startedAt: integer('started_at').notNull(),
  completedAt: integer('completed_at').notNull(),
});

export const crates = sqliteTable('crates', {
  crateId: integer('crate_id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'character' | 'background'
  price: integer('price').notNull().default(500),
  description: text('description'),
});

export const items = sqliteTable('items', {
  itemId: integer('item_id').primaryKey({ autoIncrement: true }),
  crateId: integer('crate_id').references(() => crates.crateId, { onDelete: 'set null' }),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'character' | 'background'
  theme: text('theme'), // 'human' | 'animal' | 'creature' — character items only
  rarity: text('rarity').notNull(),
  price: integer('price'),
  imageUrl: text('image_url'),
});

export const userItems = sqliteTable('user_items', {
  instanceId: integer('instance_id').primaryKey({ autoIncrement: true }),
  userId: text('user_id').notNull().references(() => users.userId, { onDelete: 'cascade' }),
  itemId: integer('item_id').notNull().references(() => items.itemId),
  equipped: integer('equipped', { mode: 'boolean' }).notNull().default(false),
  acquiredVia: text('acquired_via').notNull(),
  acquiredAt: integer('acquired_at').notNull(),
});

/**
 * Refresh tokens — deliberately NOT JWTs. Each is a random opaque ID stored
 * server-side, so a single row can be deleted to instantly revoke it (a JWT
 * would stay "valid" until it expired no matter what, since nothing server-
 * side tracks it). Access tokens are short-lived (15 min) and live in
 * localStorage per course requirement; refresh tokens are long-lived (7
 * days) and delivered only via an httpOnly cookie, unreachable by
 * client-side JS, since they're the more powerful, longer-lived credential.
 */
export const refreshTokens = sqliteTable('refresh_tokens', {
  tokenId: text('token_id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.userId, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(),
});