import { Router } from 'express';
import { body } from 'express-validator';
import { registerUser, loginUser, refreshAccessToken, logoutUser } from '../controllers/authController.js';
import { authLimiter, refreshLimiter } from '../middlewares/rateLimiter.js';

export const authRouter = Router();

authRouter.post(
  '/register',
  authLimiter,
  [
    body('username')
      .isString()
      .withMessage('Username must be a string')
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage('Username must be 3-20 characters')
      .matches(/^[A-Za-z0-9_]+$/)
      .withMessage('Username may only contain letters, numbers and underscores'),
    body('password')
      .isString()
      .withMessage('Password must be a string')
      .isLength({ min: 8, max: 72 })
      .withMessage('Password must be 8-72 characters'),
  ],
  registerUser,
);

authRouter.post(
  '/login',
  authLimiter,
  [
    body('username').isString().withMessage('Username is required').trim().notEmpty().withMessage('Username is required'),
    body('password').isString().withMessage('Password is required').notEmpty().withMessage('Password is required'),
  ],
  loginUser,
);

authRouter.post('/refresh', refreshLimiter, refreshAccessToken);
authRouter.post('/logout', logoutUser);