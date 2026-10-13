import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbAll, dbRun } from '../db/db';
import { asyncHandler } from '../middleware/errorHandler';
import { CATEGORIES_ORDER, getQuestionsByCategory } from '../services/questionBank';
import { Interview, Question } from '../types';

export const interviewsRouter = Router();

async function getAnsweredQuestionIds(interviewId: string): Promise<Set<string>> {
  const rows = await dbAll<{ question_id: string }>('SELECT question_id FROM responses WHERE interview_id = ?', [
    interviewId
  ]);
  return new Set(rows.map((r) => r.question_id));
}

async function findNextQuestion(
  interview: Interview
): Promise<{ question: Question | null; stage: string; completed: boolean }> {
  if (interview.status === 'completada') {
    return { question: null, stage: interview.stage, completed: true };
  }

  const answered = await getAnsweredQuestionIds(interview.id);
  let stageIdx = CATEGORIES_ORDER.indexOf(interview.stage);
  if (stageIdx === -1) stageIdx = 0;

  for (let i = stageIdx; i < CATEGORIES_ORDER.length; i++) {
    const category = CATEGORIES_ORDER[i];
    const questions = getQuestionsByCategory(category);
    const pending = questions.find((q) => !answered.has(q.id));
    if (pending) {
      if (category !== interview.stage) {
        await dbRun(`UPDATE interviews SET stage = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
          category,
          interview.id
        ]);
      }
      return { question: pending, stage: category, completed: false };
    }
  }

  await dbRun(`UPDATE interviews SET status = 'completada', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
    interview.id
  ]);
  return { question: null, stage: interview.stage, completed: true };
}

interviewsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const { candidate_id } = req.body as { candidate_id?: string };
    if (!candidate_id) {
      res.status(400).json({ error: 'candidate_id es requerido' });
      return;
    }

    const candidate = await dbGet('SELECT id FROM candidates WHERE id = ?', [candidate_id]);
    if (!candidate) {
      res.status(404).json({ error: 'Candidato no encontrado' });
      return;
    }

    const id = uuidv4();
    await dbRun(`INSERT INTO interviews (id, candidate_id, stage, status) VALUES (?, ?, ?, 'en_progreso')`, [
      id,
      candidate_id,
      CATEGORIES_ORDER[0]
    ]);

    const created = await dbGet('SELECT * FROM interviews WHERE id = ?', [id]);
    res.status(201).json(created);
  })
);

interviewsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { candidate_id } = req.query as { candidate_id?: string };
    const rows = candidate_id
      ? await dbAll('SELECT * FROM interviews WHERE candidate_id = ? ORDER BY created_at DESC', [candidate_id])
      : await dbAll('SELECT * FROM interviews ORDER BY created_at DESC');
    res.json(rows);
  })
);

interviewsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const interview = await dbGet('SELECT * FROM interviews WHERE id = ?', [req.params.id]);
    if (!interview) {
      res.status(404).json({ error: 'Entrevista no encontrada' });
      return;
    }
    res.json(interview);
  })
);

interviewsRouter.get(
  '/:id/next-question',
  asyncHandler(async (req, res) => {
    const interview = await dbGet<Interview>('SELECT * FROM interviews WHERE id = ?', [req.params.id]);
    if (!interview) {
      res.status(404).json({ error: 'Entrevista no encontrada' });
      return;
    }

    const result = await findNextQuestion(interview);
    res.json(result);
  })
);
