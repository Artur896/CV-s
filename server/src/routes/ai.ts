import { Router } from 'express';
import { isAiConfigured, env } from '../config/env';
import { getUsedToday, getUsedForInterview, getLastError } from '../services/rateLimiter';
import { asyncHandler } from '../middleware/errorHandler';
import { AiStatus } from '../types';

export const aiRouter = Router();

aiRouter.get(
  '/status',
  asyncHandler(async (req, res) => {
    const interviewId = req.query.interview_id as string | undefined;
    const status: AiStatus = {
      configured: isAiConfigured(),
      usedToday: await getUsedToday(),
      limitPerDay: env.MAX_AI_REQUESTS_PER_DAY,
      usedThisInterview: interviewId ? await getUsedForInterview(interviewId) : 0,
      limitPerInterview: env.MAX_AI_REQUESTS_PER_INTERVIEW,
      lastError: await getLastError()
    };
    res.json(status);
  })
);
