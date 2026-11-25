import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/connection.js';
import { findUserByUsername, insertUser, findUserById } from '../models/userModel.js';
import { insertRefreshToken, findRefreshTokenById, deleteRefreshTokenById } from '../models/refreshTokenModel.js';
import { AppError } from '../utils/_errors.js';
import { DEFAULT_AVATAR_EYES, DEFAULT_AVATAR_MOUTH } from '../utils/avatarPresets.js';

const SALT_ROUNDS = 10;
const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_PATH = '/api/auth';
const REFRESH_TOKEN_EXPIRES_MS = (parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS, 10) || 7) * 24 * 60 * 60 * 1000;

/**
 * Signs a short-lived access token. Payload only ever contains non-sensitive
 * identifiers — never the password hash. This is the token the frontend
 * stores in localStorage and sends on every request.
 * @param {object} user - { userId, username }
 * @returns {string} Signed JWT.
 */
const signAccessToken = (user) => {
  return jwt.sign({ userId: user.userId, username: user.username }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
};

/**
 * Creates a new refresh token: a random opaque ID (NOT a JWT) stored in the
 * database so it can be instantly revoked by deleting the row, unlike a JWT
 * which stays "valid" until it naturally expires regardless of DB state.
 * @param {string} userId
 * @returns {Promise<string>} The new token's ID.
 */
const generateRefreshToken = async (userId) => {
  const tokenId = uuidv4();
  const now = Date.now();

  await insertRefreshToken(db, {
    tokenId,
    userId,
    expiresAt: now + REFRESH_TOKEN_EXPIRES_MS,
    createdAt: now,
  });

  return tokenId;
};

/**
 * Sets the refresh token as an httpOnly cookie, scoped only to /api/auth
 * paths (so it's never sent on ordinary API requests, only to the
 * refresh/logout endpoints that actually need it) — and unreadable by any
 * client-side JavaScript, so an XSS bug can't steal it the way it could
 * steal a token sitting in localStorage.
 * @param {import('express').Response} res
 * @param {string} tokenId
 */
const setRefreshTokenCookie = (res, tokenId) => {
  res.cookie(REFRESH_COOKIE_NAME, tokenId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // requires HTTPS in production; must be false for local http:// dev
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_EXPIRES_MS,
  });
};

/**
 * Strips the password hash out of a user row before it's ever sent in a
 * response. Passwords must never be returned in any API response.
 * @param {object} user
 * @returns {object}
 */
const toPublicUser = (user) => {
  const { password, ...publicUser } = user;
  void password;
  return publicUser;
};

/**
 * POST /api/auth/register
 * Creates a new user account, then logs them in immediately: returns a
 * short-lived access token in the JSON body, and sets a long-lived refresh
 * token as an httpOnly cookie.
 */
export const registerUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('VALIDATION_ERROR', errors.array()[0].msg);
    }

    const { username, password } = req.body;

    const existingUser = await findUserByUsername(db, username);
    if (existingUser) {
      throw new AppError('CONFLICT', 'Username is already taken');
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const now = Date.now();

    const newUser = await insertUser(db, {
      userId: uuidv4(),
      username,
      password: hashedPassword,
      avatarEyes: DEFAULT_AVATAR_EYES,
      avatarMouth: DEFAULT_AVATAR_MOUTH,
      createdAt: now,
    });

    const accessToken = signAccessToken(newUser);
    const refreshTokenId = await generateRefreshToken(newUser.userId);
    setRefreshTokenCookie(res, refreshTokenId);

    res.status(201).json({ user: toPublicUser(newUser), accessToken });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 * Verifies credentials and issues a fresh token pair on success. Returns the
 * same "invalid username or password" message whether the username doesn't
 * exist or the password is wrong, so login attempts can't be used to
 * enumerate registered usernames.
 */
export const loginUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('VALIDATION_ERROR', errors.array()[0].msg);
    }

    const { username, password } = req.body;

    const user = await findUserByUsername(db, username);
    if (!user) {
      throw new AppError('UNAUTHORIZED', 'Invalid username or password');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      throw new AppError('UNAUTHORIZED', 'Invalid username or password');
    }

    const accessToken = signAccessToken(user);
    const refreshTokenId = await generateRefreshToken(user.userId);
    setRefreshTokenCookie(res, refreshTokenId);

    res.status(200).json({ user: toPublicUser(user), accessToken });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 * Reads the refresh token from the httpOnly cookie (never from the request
 * body — a client-side script can't access it either way), validates it
 * against the database, and issues a brand new access token. The refresh
 * token itself is ROTATED on every use (old one deleted, new one issued) —
 * standard practice that limits how long a leaked refresh token stays useful.
 */
export const refreshAccessToken = async (req, res, next) => {
  try {
    const tokenId = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!tokenId) {
      throw new AppError('UNAUTHORIZED', 'No refresh token provided');
    }

    const storedToken = await findRefreshTokenById(db, tokenId);
    if (!storedToken) {
      throw new AppError('UNAUTHORIZED', 'Invalid refresh token');
    }

    if (storedToken.expiresAt < Date.now()) {
      await deleteRefreshTokenById(db, tokenId);
      throw new AppError('UNAUTHORIZED', 'Refresh token has expired, please log in again');
    }

    const user = await findUserById(db, storedToken.userId);
    if (!user) {
      await deleteRefreshTokenById(db, tokenId);
      throw new AppError('UNAUTHORIZED', 'User no longer exists');
    }

    // Rotate: the old refresh token is consumed and replaced by a new one.
    await deleteRefreshTokenById(db, tokenId);
    const newRefreshTokenId = await generateRefreshToken(user.userId);
    setRefreshTokenCookie(res, newRefreshTokenId);

    const accessToken = signAccessToken(user);

    res.status(200).json({ accessToken });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 * Deletes the refresh token server-side (instant revocation) and clears the
 * cookie. Deliberately does NOT require a valid access token — a user
 * should be able to log out even if their access token has already expired,
 * since the refresh token cookie is all this endpoint actually needs.
 */
export const logoutUser = async (req, res, next) => {
  try {
    const tokenId = req.cookies?.[REFRESH_COOKIE_NAME];

    if (tokenId) {
      await deleteRefreshTokenById(db, tokenId);
    }

    res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
    res.status(200).json({ message: 'Logged out' });
  } catch (error) {
    next(error);
  }
};