import { eq, and } from 'drizzle-orm';
import { userItems, items } from '../db/schema.js';

export const insertUserItem = async (db, newUserItem) => {
  const result = await db.insert(userItems).values({ ...newUserItem, equipped: false }).returning();
  return result[0];
};

export const findUserItemById = async (db, instanceId) => {
  const result = await db
    .select({
      instanceId: userItems.instanceId,
      userId: userItems.userId,
      itemId: userItems.itemId,
      equipped: userItems.equipped,
      acquiredVia: userItems.acquiredVia,
      acquiredAt: userItems.acquiredAt,
      itemType: items.type,
      itemTheme: items.theme,
    })
    .from(userItems)
    .innerJoin(items, eq(userItems.itemId, items.itemId))
    .where(eq(userItems.instanceId, instanceId));
  return result[0];
};

export const findUserItemsWithDetailsByUserId = async (db, userId) => {
  return db
    .select({
      instanceId: userItems.instanceId,
      itemId: userItems.itemId,
      equipped: userItems.equipped,
      acquiredVia: userItems.acquiredVia,
      acquiredAt: userItems.acquiredAt,
      name: items.name,
      type: items.type,
      theme: items.theme,
      rarity: items.rarity,
      imageUrl: items.imageUrl,
    })
    .from(userItems)
    .innerJoin(items, eq(userItems.itemId, items.itemId))
    .where(eq(userItems.userId, userId));
};

export const findEquippedItemByType = async (db, userId, type) => {
  const result = await db
    .select({
      instanceId: userItems.instanceId,
      itemId: userItems.itemId,
      name: items.name,
      type: items.type,
      theme: items.theme,
      rarity: items.rarity,
      imageUrl: items.imageUrl,
    })
    .from(userItems)
    .innerJoin(items, eq(userItems.itemId, items.itemId))
    .where(and(eq(userItems.userId, userId), eq(userItems.equipped, true), eq(items.type, type)));
  return result[0];
};

export const unequipAllOfTypeForUser = async (db, userId, type) => {
  const currentlyEquipped = await db
    .select({ instanceId: userItems.instanceId })
    .from(userItems)
    .innerJoin(items, eq(userItems.itemId, items.itemId))
    .where(and(eq(userItems.userId, userId), eq(userItems.equipped, true), eq(items.type, type)));

  for (const row of currentlyEquipped) {
    await db.update(userItems).set({ equipped: false }).where(eq(userItems.instanceId, row.instanceId));
  }
};

export const setInstanceEquipped = async (db, instanceId, equipped) => {
  const result = await db.update(userItems).set({ equipped }).where(eq(userItems.instanceId, instanceId)).returning();
  return result[0];
};

export const deleteUserItem = async (db, instanceId) => {
  const result = await db.delete(userItems).where(eq(userItems.instanceId, instanceId)).returning();
  return result[0];
};