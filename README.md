# Study Timer

A gamified study timer built with Express.js, libSQL, and Drizzle ORM. Every
second spent in a focus session earns in-game points, which can be spent on
crates to unlock a study companion character and a background scene, both
shown next to the timer while you study.

## Core Mechanics

**Mechanic 1 — Timer & Points**
Countdown timer or stopwatch sessions are logged via the API. Every focus
second earns 1 point. Points are calculated entirely server-side from
`durationSeconds` — the client cannot submit a `pointsEarned` value and have
it trusted.

**Mechanic 2 — Shop, Crates & Companions**
Points are spent two ways, across two independent crates:
- **Character Crate** (500 points) — a themed loot box. Opening one rolls a
  random companion, weighted by rarity: common 45% / uncommon 25% / rare
  15% / epic 10% / legendary 5%. Legendary characters can *only* come from
  crates.
- **Background Crate** (500 points) — same loot mechanic, but for background
  scenes shown behind the character instead.
- **Direct purchase** — buy a specific non-legendary character or background
  outright at a higher fixed price (800+, scaling with rarity).

Owned items sit in inventory until **equipped**. Equipping a character never
affects an equipped background and vice versa — they're two independent
slots, so a user can have one of each active at a time. Equipping a new item
of a given type automatically unequips the previous one of that same type.

A public leaderboard ranks users by **lifetime accumulated points** (total
ever earned from focus sessions) — not current spendable balance, so buying
things doesn't hurt your rank.

## Quick Start

\`\`\`bash
npm install
npm run db
npm run dev
\`\`\`

Open:
- `http://localhost:3000/index.html` — the study timer (main page)
- `http://localhost:3000/api/health` — health check
- `http://localhost:3000/api-docs` — Swagger docs

**Re-run `npm run db` any time the schema or seed data changes** — it wipes
and recreates the local database. If you're logged in in the browser when
that happens, your saved token will point to a now-deleted user; just log
out and back in (or clear `localStorage`/cookies) to fix
`FOREIGN KEY constraint failed` / `User not found` errors.

## Pages

| Page | Description |
|---|---|
| `index.html` | Timer/stopwatch + your equipped character & background as the whole page backdrop |
| `login.html` / `register.html` | Auth |
| `shop.html` | Browse & open crates, buy characters/backgrounds directly |
| `inventory.html` | View owned items, equip/unequip characters & backgrounds |
| `profile.html` | Avatar (editable via preset eyes/mouth pickers), current/lifetime points, total time studied, session history |
| `leaderboard.html` | Top users by lifetime accumulated points |

## Test Accounts

Seeded by `npm run db`:

| Username | Password | Points | Notes |
|---|---|---|---|
| `violet` | `password123` | 3200 | Sample session history + a couple owned items |
| `demo` | `demo1234` | 500 | Fresh account, no history |
| `showcase` | `showcase123` | 5000 | Owns the full 10-character + 10-background catalog, for demoing once real media is uploaded |

## Database Schema

Six tables: `users`, `sessions`, `crates`, `items`, `user_items`,
`refresh_tokens`. See `ERD.dbml` (or the diagram in the CA2 report) for the
full entity relationship diagram.

## API Endpoints

### Auth (`/api/auth`) — public, rate-limited
Register and login are both rate-limited to 10 requests per 15 minutes per
IP (shared across both endpoints) against brute-force attempts.

| Method | Route | Description |
|---|---|---|
| POST | `/register` | Create an account. Returns `{ user, accessToken }`; also sets a long-lived refresh token as an httpOnly cookie |
| POST | `/login` | Authenticate. Same response/cookie shape as register |
| POST | `/refresh` | Reads the refresh cookie, rotates it (old one revoked, new one issued), returns a fresh `accessToken` |
| POST | `/logout` | Revokes the refresh token server-side and clears the cookie |

### Sessions (`/api/sessions`) — requires auth
| Method | Route | Description |
|---|---|---|
| POST | `/` | Log a completed timer/stopwatch session, awards points server-side |
| GET | `/` | List the caller's own session history (`?limit=`) |
| GET | `/:id` | Get one session (owner only) |

### Users (`/api/users`)
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/leaderboard` | Public | Top N users by lifetime accumulated points (`?limit=`) |
| GET | `/me` | Required | Current user's live data (points, avatar, etc.) |
| PATCH | `/me/avatar` | Required | Update avatar eyes/mouth independently |

### Crates & Items (`/api/crates`, `/api/items`) — browsing is public
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/crates` | Public | List both crates (Character, Background) |
| GET | `/crates/:id` | Public | One crate + its full item pool |
| POST | `/crates/:id/open` | Required | Open a crate (weighted random roll) |
| GET | `/items` | Public | Browse items (`?type=character\|background`, `?theme=human\|animal\|creature`, `?purchasable=true`) |
| GET | `/items/:id` | Public | One item's details |
| POST | `/items/:id/purchase` | Required | Buy an item directly (blocked for legendary) |

### Inventory (`/api/inventory`) — requires auth
| Method | Route | Description |
|---|---|---|
| GET | `/` | List every owned item (character + background) |
| GET | `/equipped` | Currently equipped character AND background |
| PATCH | `/:instanceId` | Equip/unequip one item (`{ "equipped": true/false }`) |
| DELETE | `/:instanceId` | Permanently remove an owned item |

## Design Decisions & Assumptions

These deviate from or extend the provided scaffold and are documented here
for transparency:

- **`src/utils/_errors.js`** is marked "DO NOT MODIFY" in the scaffold, but
  only shipped with 4 generic error codes. Three were added —
  `UNAUTHORIZED` (401), `CONFLICT` (409), `FORBIDDEN` (403) — since the app
  needs proper status codes for failed auth, duplicate usernames, and
  owner-only resource access. Only the `ERROR_CODES` map was extended; the
  `AppError` class and `errorHandler` function were left untouched.

- **`index.js`** originally had a comment saying it would "only listen when
  run directly (not imported for testing)" but was missing the actual guard,
  meaning every `npm test` run silently started a real server on port 3000.
  Added the missing check (`process.argv[1] === fileURLToPath(import.meta.url)`).

- **`user_id` is a UUID (text), not an auto-incrementing integer.** This
  avoids exposing a guessable, enumerable user count via the API/JWT.

- **The original room/wall-decoration mechanic was replaced with a character +
  background equip system.** Rather than placing items at `(x, y)`
  coordinates in a room, users equip exactly one character and one
  background at a time — two independent slots on the same `user_items`
  table (`equipped` boolean), rather than two separate concepts.

- **Two crates only, not one per theme.** `crates.type` is `'character'` or
  `'background'`; the character crate's pool spans all three character
  themes (human/animal/creature) rather than needing a separate crate per
  theme. `items.theme` is only meaningful for character items and is `null`
  for backgrounds.

- **Legendary items are crate-exclusive.** Their `price` column is `null` in
  the catalog, and the purchase endpoint checks the stored item's
  rarity/price server-side, not any client-supplied flag.

- **Crate rarity odds are fixed server-side data**, never sent by or trusted
  from the client. If a crate's pool is missing a rarity tier, odds are
  renormalised across whichever tiers are actually present rather than
  erroring.

- **The leaderboard ranks by lifetime accumulated points, not current
  balance.** `totalPoints` on `users` is the spendable balance and goes down
  when a user buys something; the leaderboard instead sums every focus
  session's `pointsEarned` via a database-level `SUM`, so spending doesn't
  hurt rank.

- **`sessionName` is free-text and always rendered via `textContent`, never
  `innerHTML`.** It's validated server-side as a plain string (max 100
  chars) but the real XSS protection is at render time on the frontend —
  a malicious session name (e.g. `<img src=x onerror=...>`) displays as
  harmless literal text instead of executing.

- **The timer's duration input accepts up to 6 typed digits**, interpreted
  as HH+MM+SS, normalized with real time-math carrying (e.g. typing 75
  minutes carries into `01:15:00`) — but only once entry is complete or the
  field loses focus, never on every keystroke, so partial input is never
  prematurely "corrected" mid-type.

- **Authentication uses a short-lived access token + long-lived refresh
  token pair, not a single JWT.** The access token (15 min, JWT) lives in
  `localStorage`, per course requirement. The refresh token (7 days) is
  deliberately *not* a JWT — it's a random opaque ID stored server-side in
  `refresh_tokens`, delivered only via an httpOnly cookie scoped to
  `/api/auth`, so client-side JS can never read it even if XSS occurred. It
  **rotates** on every use (old row deleted, new one issued), so a replayed
  old refresh token is rejected immediately — verified directly by
  registering, refreshing once, then attempting to reuse the pre-rotation
  cookie and confirming it's cleanly rejected with `401`.

- **`helmet` and rate limiting were added for defense-in-depth.** Login and
  register are rate-limited (10 requests/15 min per IP, shared across both
  endpoints) against brute-force attempts. Helmet's default
  Content-Security-Policy initially blocked character/background images
  from loading (they're hosted on Cloudinary, a different origin from
  `img-src 'self'`) — fixed with a precise one-directive allowlist
  (`imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com']`) rather than
  disabling CSP wholesale, so every other protection stays intact.

- **`cors` was removed entirely, not just configured narrowly.** Since
  `index.js` serves both the frontend and the API from the same origin
  (`express.static('src/frontend')` alongside the `/api` routes), there is
  no cross-origin request to allow in the first place — CORS only matters
  when a page on one origin calls an API on another. With no `cors()`
  middleware, the browser's own default behavior already blocks any
  cross-origin request from reading the response, which is at least as
  restrictive as a narrowly-configured allowlist would have been.

- **Character/background art is added by directly pasting a hosted image URL
  into `seed.js`, not through an in-app upload feature.** Images/GIFs are
  uploaded manually via Cloudinary's own dashboard, and the resulting URL is
  pasted as that item's `imageUrl` in the seed data, then reseeded with
  `npm run db`. Deliberately simple — no upload endpoint, no file storage
  concerns, no separate upload script.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with nodemon |
| `npm run db` | Reset database and run seed script |
| `npm run studio` | Open Drizzle Studio to browse/edit the database visually |
| `npm test` | Run test suite |
| `npm run export` | Create `export.zip` for submission |