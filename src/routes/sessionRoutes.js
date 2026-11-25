import { Router } from 'express';
import { body } from 'express-validator';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { createSession, getMySessions, getSessionById } from '../controllers/sessionController.js';

export const sessionRouter = Router();

// All session routes require a logged-in user
sessionRouter.use(requireAuth);

sessionRouter.post(
  '/',
  [
    body('mode').isIn(['stopwatch', 'timer']).withMessage('mode must be stopwatch or timer'),
    body('sessionType').isIn(['focus', 'rest']).withMessage('sessionType must be focus or rest'),
    body('durationSeconds').isInt({ min: 1 }).withMessage('durationSeconds must be a positive integer'),
    body('sessionName').optional({ nullable: true }).isString().withMessage('sessionName must be a string').isLength({ max: 100 }).withMessage('sessionName must be 100 characters or fewer'),
  ],
  createSession,
);

// GET /api/sessions — must come before /:id since it has no param to collide with
sessionRouter.get('/', getMySessions);

// GET /api/sessions/:id — dynamic route
sessionRouter.get('/:id', getSessionById);