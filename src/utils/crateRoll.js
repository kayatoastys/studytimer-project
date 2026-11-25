// Pure weighted-random selection logic for crate opening. Kept separate from
// the controller so the odds can be tested in isolation from HTTP/DB.

export const RARITY_WEIGHTS = {
  common: 45,
  uncommon: 25,
  rare: 15,
  epic: 10,
  legendary: 5,
};

/**
 * Rolls one item from a crate's item pool, respecting rarity odds. If the
 * pool is missing some rarity tiers (e.g. a crate with no legendary items
 * yet), the odds are renormalised across only the tiers actually present,
 * rather than failing or silently favouring whatever tier happens to exist.
 * @param {object[]} pool - Items belonging to one crate (from findItemsByCrateId).
 * @returns {object} The single item that was rolled.
 * @throws {Error} If the pool is empty.
 */
export const rollItemFromPool = (pool) => {
  if (!pool || pool.length === 0) {
    throw new Error('Cannot roll from an empty item pool');
  }

  const itemsByRarity = {};
  for (const item of pool) {
    if (!itemsByRarity[item.rarity]) itemsByRarity[item.rarity] = [];
    itemsByRarity[item.rarity].push(item);
  }

  const availableRarities = Object.keys(RARITY_WEIGHTS).filter((rarity) => itemsByRarity[rarity]?.length > 0);
  const totalWeight = availableRarities.reduce((sum, rarity) => sum + RARITY_WEIGHTS[rarity], 0);

  const roll = Math.random() * totalWeight;
  let cumulative = 0;
  let chosenRarity = availableRarities[availableRarities.length - 1];

  for (const rarity of availableRarities) {
    cumulative += RARITY_WEIGHTS[rarity];
    if (roll < cumulative) {
      chosenRarity = rarity;
      break;
    }
  }

  const candidates = itemsByRarity[chosenRarity];
  const chosenItem = candidates[Math.floor(Math.random() * candidates.length)];

  return chosenItem;
};