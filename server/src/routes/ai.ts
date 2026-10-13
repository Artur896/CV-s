import { Router } from 'express';
import { isAiConfigured, env } from '../config/env';
import { getUsedToday, getUsedForInterview, getLastError } from '../services/rateLimiter';
import { AiStatus } from '../types';

export const aiRouter = Router();

aiRouter.get('/status', (req, res) => {
  const interviewId = req.query.interview_id as string | undefined;
  const status: AiStatus = {
    configured: isAiConfigured(),
    usedToday: getUsedToday(),
    limitPerDay: env.MAX_AI_REQUESTS_PER_DAY,
    usedThisInterview: interviewId ? getUsedForInterview(interviewId) : 0,
    limitPerInterview: env.MAX_AI_REQUESTS_PER_INTERVIEW,
    lastError: getLastError()
  };
  res.json(status);
});
