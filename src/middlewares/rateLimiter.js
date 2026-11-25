// Rate limiting for auth endpoints — the actual defense against online
// brute-force login attempts. bcrypt makes each password guess slow, but
// that only matters if an attacker has stolen the database; it does nothing
// to stop scripted guessing against the live /login endpoint, which is what
// this middleware is for.

import rateLimit from 'express-rate-limit';

/**
 * Applied to POST /api/auth/login and POST /api/auth/register.
 * 10 requests per 15 minutes per IP — generous enough for normal use
 * (typos, switching between login/register) but well below what a
 * brute-force script needs to be useful.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // Matches the app's normal { error: { code, message, status } } shape,
  // so the frontend's existing error-handling code works unchanged here too.
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many attempts. Please try again in a few minutes.',
        status: 429,
      },
    });
  },
});

/**
 * Applied to POST /api/auth/refresh. Separate from authLimiter so normal
 * silent token refreshes (every ~15 min per tab) never eat into the
 * login/register budget. Looser, but still stops scripted hammering.
 */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many refresh attempts. Please try again in a few minutes.',
        status: 429,
      },
    });
  },
});