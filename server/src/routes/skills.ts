import { Router } from 'express';
import { dbAll, dbRun } from '../db/db';
import { asyncHandler } from '../middleware/errorHandler';

export const skillsRouter = Router();

skillsRouter.get(
  '/:interviewId/skills',
  asyncHandler(async (req, res) => {
    const rows = await dbAll(
      'SELECT * FROM detected_skills WHERE interview_id = ? ORDER BY created_at ASC',
      [req.params.interviewId]
    );
    res.json(rows);
  })
);

skillsRouter.delete(
  '/:interviewId/skills/:skillId',
  asyncHandler(async (req, res) => {
    await dbRun('DELETE FROM detected_skills WHERE id = ? AND interview_id = ?', [
      req.params.skillId,
      req.params.interviewId
    ]);
    res.status(204).send();
  })
);
