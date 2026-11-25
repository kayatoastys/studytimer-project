import { Router } from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { getLeaderboard, updateMyAvatar, getMyProfile } from '../controllers/userController.js';

export const userRouter = Router();

userRouter.get('/leaderboard', getLeaderboard);
userRouter.get('/me', requireAuth, getMyProfile);
userRouter.patch('/me/avatar', requireAuth, updateMyAvatar);