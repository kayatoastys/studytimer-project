// Reusable authentication middleware. Apply to any route that requires a
// logged-in user: router.get('/protected', requireAuth, someController)

import jwt from 'jsonwebtoken';
import { AppError } from '../utils/_errors.js';

/**
 * Verifies the JWT sent in the Authorization header (format: "Bearer <token>").
 * On success, attaches { userId, username } to req.user and calls next().
 * On failure, forwards a 401 AppError to the global error handler — the
 * request never reaches the protected controller.
 */
export const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('UNAUTHORIZED', 'Missing or malformed Authorization header');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = { userId: decoded.userId, username: decoded.username };
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    // Covers jwt.verify failures: expired token, bad signature, malformed token
    next(new AppError('UNAUTHORIZED', 'Invalid or expired token'));
  }
};