import { Request, Response, NextFunction } from 'express';
import { AiLimitError } from '../services/rateLimiter';
import { AiUnavailableError } from '../services/GroqService';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AiLimitError) {
    res.status(429).json({ error: err.message, code: 'AI_LIMIT_REACHED' });
    return;
  }
  if (err instanceof AiUnavailableError) {
    res.status(503).json({ error: err.message, code: 'AI_UNAVAILABLE' });
    return;
  }
  const message = err instanceof Error ? err.message : 'Error interno del servidor';
  console.error(err);
  res.status(500).json({ error: message, code: 'INTERNAL_ERROR' });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
