/**
 * Seed data and database reset script. Run with: npm run db
 *
 * To add real character/background art: upload the image on Cloudinary's
 * website (or any host), copy the link it gives you, and paste it as the
 * `imageUrl` value below for that item — replace `null` with the URL string,
 * e.g. imageUrl: 'https://res.cloudinary.com/your-cloud/.../gamer.gif'.
 * Then run `npm run db` to reseed with the new URL.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { users, crates, items, userItems, sessions } from './schema.js';

const SALT_ROUNDS = 10;

// --- Seed function ---

/** Insert seed data into the database. */
export const seed = async (db) => {
  const now = Date.now();

  // --- Crates: just 2 now — Character and Background ---
  const insertedCrates = await db
    .insert(crates)
    .values([
      { name: 'Character Crate', type: 'character', price: 500, description: 'A companion who studies alongside you.' },
      { name: 'Background Crate', type: 'background', price: 500, description: 'A scene to study in front of.' },
    ])
    .returning();

  const characterCrateId = insertedCrates.find((c) => c.type === 'character').crateId;
  const backgroundCrateId = insertedCrates.find((c) => c.type === 'background').crateId;

  // --- Character items: 10 total, trimmed so real media can realistically
  // be sourced/uploaded for every single one — no "No media yet" labels
  // once done. One item per rarity tier, plus one extra for common/
  // uncommon/rare/epic (legendary stays singular — should feel exclusive,
  // and is the hardest tier to source art for anyway). ---
  const characterItems = [
    { name: 'Cat', rarity: 'common', price: 800, theme: 'animal', imageUrl: 'https://res.cloudinary.com/hgrlaphe/image/upload/v1786561508/cat_ahm5da.gif' },
    { name: 'Dog', rarity: 'common', price: 800, theme: 'animal', imageUrl: 'https://res.cloudinary.com/hgrlaphe/image/upload/v1786709473/dog_tcoadx.gif' },
    { name: 'Rabbit', rarity: 'common', price: 800, theme: 'animal', imageUrl: 'https://res.cloudinary.com/hgrlaphe/image/upload/v1786708703/rabbit_ysuqoy.gif' },
    { name: 'Fox', rarity: 'uncommon', price: 1250, theme: 'animal', imageUrl: 'https://res.cloudinary.com/hgrlaphe/image/upload/v1786602430/fox_rze6wj.gif' },
    { name: 'Duck', rarity: 'uncommon', price: 1200, theme: 'animal', imageUrl: 'https://res.cloudinary.com/hgrlaphe/image/upload/v1786710702/duck_s7vm3g.gif' },
    { name: 'Otter', rarity: 'rare', price: 1800, theme: 'animal', imageUrl: 'https://res.cloudinary.com/hgrlaphe/image/upload/v1786603432/otter_qyt8i5.gif' },
    { name: 'Astronaut', rarity: 'rare', price: 1800, theme: 'human', imageUrl: 'https://res.cloudinary.com/hgrlaphe/image/upload/v1786710699/astronaut_yid9vo.gif' },
    { name: 'Red Panda', rarity: 'epic', price: 2600, theme: 'animal', imageUrl: 'https://res.cloudinary.com/hgrlaphe/image/upload/v1786700399/red-panda_m4vtpx.gif' },
    { name: 'Frog Wizard', rarity: 'epic', price: 2600, theme: 'human', imageUrl: 'https://res.cloudinary.com/hgrlaphe/image/upload/v1786711494/frog-wizard_owqjkr.gif' },
    { name: 'Ancient Dragon', rarity: 'legendary', price: null, theme: 'creature', imageUrl: 'https://res.cloudinary.com/hgrlaphe/image/upload/v1786700395/dragon_halvny.gif' },
  ].map((item) => ({
    ...item,
    crateId: characterCrateId,
    type: 'character',
  }));

  // --- Background items: 10 total, same trimming logic as characters. ---
  const backgroundItems = [
    { name: 'Cozy Bedroom', rarity: 'common', price: 800, imageUrl: 'https://res.cloudinary.com/hgrlaphe/image/upload/v1786692906/bedroom_ataxxl.jpg' },
    { name: 'Cafe Window', rarity: 'common', price: 800, imageUrl: 'https://res.cloudinary.com/hgrlaphe/image/upload/v1786708797/cafe_rk3ycc.jpg' },
    { name: 'Library Nook', rarity: 'common', price: 800, imageUrl: 'https://res.cloudinary.com/hgrlaphe/image/upload/v1786708797/library_chsz4w.jpg' },
    { name: 'Forest Clearing', rarity: 'uncommon', price: 1200, imageUrl: 'https://res.cloudinary.com/hgrlaphe/image/upload/v1786649117/forest_v3sfxx.jpg' },
    { name: 'Mountain Cabin', rarity: 'uncommon', price: 1300, imageUrl: 'https://res.cloudinary.com/hgrlaphe/image/upload/v1786708796/mountain_wrgyct.jpg' },
    { name: 'Beach Sunset', rarity: 'rare', price: 1800, imageUrl: 'https://res.cloudinary.com/hgrlaphe/image/upload/v1786649117/sunset_mq8ktp.jpg' },
    { name: 'Space Station', rarity: 'rare', price: 1900, imageUrl: 'https://res.cloudinary.com/hgrlaphe/image/upload/v1786708795/space_station_ycibko.jpg' },
    { name: 'Neon City Night', rarity: 'epic', price: 2600, imageUrl: 'https://res.cloudinary.com/hgrlaphe/image/upload/v1786649417/neon-city-night_dowo4w.jpg' },
    { name: 'Enchanted Garden', rarity: 'epic', price: 2800, imageUrl: 'https://res.cloudinary.com/hgrlaphe/image/upload/v1786709466/garden_blbchp.jpg' },
    { name: 'Aurora Sky', rarity: 'legendary', price: null, imageUrl: 'https://res.cloudinary.com/hgrlaphe/image/upload/v1786650275/aurora_borealis_vzymiz.jpg' },
  ].map((item) => ({ ...item, crateId: backgroundCrateId, type: 'background', theme: null }));

  const insertedItems = await db
    .insert(items)
    .values([...characterItems, ...backgroundItems])
    .returning();

  // --- Demo users ---
  const violetId = uuidv4();
  const demoId = uuidv4();

  await db.insert(users).values([
    {
      userId: violetId,
      username: 'violet',
      password: await bcrypt.hash('password123', SALT_ROUNDS),
      totalPoints: 3200,
      avatarEyes: 'star',
      avatarMouth: 'grin',
      createdAt: now,
    },
    {
      userId: demoId,
      username: 'demo',
      password: await bcrypt.hash('demo1234', SALT_ROUNDS),
      totalPoints: 500,
      avatarEyes: 'round',
      avatarMouth: 'smile',
      createdAt: now,
    },
  ]);

  // --- Sample sessions (so points/history aren't empty on first login) ---
  await db.insert(sessions).values([
    {
      userId: violetId,
      mode: 'timer',
      sessionType: 'focus',
      durationSeconds: 1500,
      pointsEarned: 1500,
      startedAt: now - 3600000,
      completedAt: now - 3600000 + 1500000,
    },
    {
      userId: violetId,
      mode: 'timer',
      sessionType: 'rest',
      durationSeconds: 300,
      pointsEarned: 0,
      startedAt: now - 2000000,
      completedAt: now - 2000000 + 300000,
    },
    {
      userId: violetId,
      mode: 'stopwatch',
      sessionType: 'focus',
      durationSeconds: 1700,
      pointsEarned: 1700,
      startedAt: now - 1000000,
      completedAt: now - 1000000 + 1700000,
    },
  ]);

  // --- Sample owned items for violet: one equipped character, one equipped
  // background, plus one extra sitting unequipped in inventory ---
  const cat = insertedItems.find((item) => item.name === 'Cat');
  const dog = insertedItems.find((item) => item.name === 'Dog');
  const cozyBedroom = insertedItems.find((item) => item.name === 'Cozy Bedroom');

  await db.insert(userItems).values([
    {
      userId: violetId,
      itemId: cat.itemId,
      equipped: true,
      acquiredVia: 'shop',
      acquiredAt: now,
    },
    {
      userId: violetId,
      itemId: dog.itemId,
      equipped: false,
      acquiredVia: 'crate',
      acquiredAt: now,
    },
    {
      userId: violetId,
      itemId: cozyBedroom.itemId,
      equipped: true,
      acquiredVia: 'shop',
      acquiredAt: now,
    },
  ]);
  // --- Showcase demo user: owns the FULL trimmed catalog (all 10
  // characters + 10 backgrounds), so switching to this account during a
  // demo shows the complete, fully-media-ready experience once every item
  // has real art uploaded — zero "No media yet" labels anywhere. ---
  const showcaseId = uuidv4();

  await db.insert(users).values({
    userId: showcaseId,
    username: 'showcase',
    password: await bcrypt.hash('showcase123', SALT_ROUNDS),
    totalPoints: 5000,
    avatarEyes: 'wink',
    avatarMouth: 'grin',
    createdAt: now,
  });

  const mediaReadyNames = [
    'Cat', 'Dog', 'Rabbit', 'Fox', 'Owl', 'Otter', 'Astronaut', 'Red Panda', 'Wizard Scholar', 'Ancient Dragon',
    'Cozy Bedroom', 'Cafe Window', 'Library Nook', 'Forest Clearing', 'Mountain Cabin',
    'Beach Sunset', 'Space Station', 'Neon City Night', 'Enchanted Garden', 'Aurora Sky',
  ];

  const showcaseItemRows = mediaReadyNames.map((name) => {
    const matchedItem = insertedItems.find((item) => item.name === name);
    return {
      userId: showcaseId,
      itemId: matchedItem.itemId,
      equipped: name === 'Cat' || name === 'Cozy Bedroom', // one character + one background equipped
      acquiredVia: 'shop',
      acquiredAt: now,
    };
  });

  await db.insert(userItems).values(showcaseItemRows);

  console.log(
    `  Seeded 2 crates, ${insertedItems.length} items, 3 users, 3 sessions, 3 owned items for violet + ${showcaseItemRows.length} owned items for showcase.`,
  );
};

// --- Database reset (no need to modify below) ---

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');

const dbUrl = process.env.DATABASE_URL || 'file:local.db';
const dbPath = dbUrl.replace('file:', '');
const absoluteDbPath = path.resolve(projectRoot, dbPath);

const resetDatabase = async () => {
  try {
    if (fs.existsSync(absoluteDbPath)) {
      fs.unlinkSync(absoluteDbPath);
      console.log(`Deleted old database: ${dbPath}`);
    }

    console.log('Creating tables from schema...');
    execSync('npx drizzle-kit push', {
      cwd: projectRoot,
      stdio: 'inherit',
    });

    console.log('Seeding database...');
    const { db } = await import('./connection.js');
    await seed(db);

    console.log('Done! Database is ready.');
  } catch (error) {
    console.error('Failed to reset database:', error.message);
    process.exit(1);
  }
};

resetDatabase();