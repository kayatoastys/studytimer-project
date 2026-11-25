import { validationResult } from 'express-validator';
import { db } from '../db/connection.js';
import { insertSession, findSessionById, findSessionsByUserId } from '../models/sessionModel.js';
import { incrementUserPoints, findUserById } from '../models/userModel.js';
import { AppError } from '../utils/_errors.js';

export const createSession = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError('VALIDATION_ERROR', errors.array()[0].msg);
    }

    const { userId } = req.user;
    const { mode, sessionType, durationSeconds, sessionName } = req.body;

    const completedAt = Date.now();
    const startedAt = completedAt - durationSeconds * 1000;
    const pointsEarned = sessionType === 'focus' ? durationSeconds : 0;

    const newSession = await insertSession(db, {
      userId,
      mode,
      sessionType,
      sessionName: sessionName ? sessionName.trim().slice(0, 100) : null,
      durationSeconds,
      pointsEarned,
      startedAt,
      completedAt,
    });

    let updatedUser;
    if (pointsEarned > 0) {
      updatedUser = await incrementUserPoints(db, userId, pointsEarned);
    } else {
      updatedUser = await findUserById(db, userId);
    }

    res.status(201).json({
      session: newSession,
      totalPoints: updatedUser.totalPoints,
    });
  } catch (error) {
    next(error);
  }
};

export const getMySessions = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;

    const mySessions = await findSessionsByUserId(db, userId, limit);

    res.status(200).json({ sessions: mySessions });
  } catch (error) {
    next(error);
  }
};

export const getSessionById = async (req, res, next) => {
  try {
    const sessionId = parseInt(req.params.id, 10);

    if (Number.isNaN(sessionId)) {
      throw new AppError('VALIDATION_ERROR', 'Session id must be a number');
    }

    const session = await findSessionById(db, sessionId);
    if (!session) {
      throw new AppError('NOT_FOUND', 'Session not found');
    }

    if (session.userId !== req.user.userId) {
      throw new AppError('FORBIDDEN', 'You do not have permission to view this session');
    }

    res.status(200).json({ session });
  } catch (error) {
    next(error);
  }
};