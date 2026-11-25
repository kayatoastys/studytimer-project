import { db } from '../db/connection.js';
import { findTopUsersByAccumulatedPoints, updateUserAvatar, findUserById } from '../models/userModel.js';
import { AVATAR_EYE_OPTIONS, AVATAR_MOUTH_OPTIONS } from '../utils/avatarPresets.js';
import { AppError } from '../utils/_errors.js';

const DEFAULT_LEADERBOARD_LIMIT = 10;

/**
 * GET /api/users/leaderboard?limit=10
 * Public read-only endpoint — returns the top N users by lifetime
 * accumulated points (total ever earned from focus sessions), not by
 * current spendable balance. Sorting/limiting happens at the database level.
 */
export const getLeaderboard = async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : DEFAULT_LEADERBOARD_LIMIT;

    const topUsers = await findTopUsersByAccumulatedPoints(db, limit);

    res.status(200).json({ leaderboard: topUsers });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/me
 * Returns the authenticated user's current data (never the password hash).
 * Used by the frontend to refresh cached login data — e.g. points earned
 * since login — without needing to log in again.
 */
export const getMyProfile = async (req, res, next) => {
  try {
    const user = await findUserById(db, req.user.userId);
    if (!user) {
      throw new AppError('NOT_FOUND', 'User not found');
    }

    const { password, ...publicUser } = user;
    void password;

    res.status(200).json({ user: publicUser });
  } catch (error) {
    next(error);
  }
};

export const updateMyAvatar = async (req, res, next) => {
  try {
    const { avatarEyes, avatarMouth } = req.body;

    if (avatarEyes === undefined && avatarMouth === undefined) {
      throw new AppError('VALIDATION_ERROR', 'Provide at least one of avatarEyes or avatarMouth');
    }

    if (avatarEyes !== undefined && !AVATAR_EYE_OPTIONS.includes(avatarEyes)) {
      throw new AppError('VALIDATION_ERROR', `avatarEyes must be one of: ${AVATAR_EYE_OPTIONS.join(', ')}`);
    }

    if (avatarMouth !== undefined && !AVATAR_MOUTH_OPTIONS.includes(avatarMouth)) {
      throw new AppError('VALIDATION_ERROR', `avatarMouth must be one of: ${AVATAR_MOUTH_OPTIONS.join(', ')}`);
    }

    const updates = {};
    if (avatarEyes !== undefined) updates.avatarEyes = avatarEyes;
    if (avatarMouth !== undefined) updates.avatarMouth = avatarMouth;

    const updatedUser = await updateUserAvatar(db, req.user.userId, updates);

    res.status(200).json({
      avatarEyes: updatedUser.avatarEyes,
      avatarMouth: updatedUser.avatarMouth,
    });
  } catch (error) {
    next(error);
  }
};