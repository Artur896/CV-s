import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbAll, dbRun } from '../db/db';
import { asyncHandler } from '../middleware/errorHandler';
import { detectSkillsFromText } from '../services/ruleBasedSkills';
import { isAnswerVague, getQuestionById } from '../services/questionBank';
import { generateFollowUp, AiUnavailableError } from '../services/GroqService';
import { AiLimitError } from '../services/rateLimiter';
import { isAiConfigured } from '../config/env';
import { Interview } from '../types';

export const responsesRouter = Router();

responsesRouter.get(
  '/:interviewId/responses',
  asyncHandler(async (req, res) => {
    const rows = await dbAll(
      'SELECT * FROM responses WHERE interview_id = ? ORDER BY created_at ASC',
      [req.params.interviewId]
    );
    res.json(rows);
  })
);

responsesRouter.post(
  '/:interviewId/responses',
  asyncHandler(async (req, res) => {
    const { question_id, category, question_text, answer } = req.body as {
      question_id?: string;
      category?: string;
      question_text?: string;
      answer?: string;
    };

    if (!question_id || !question_text || !answer || !answer.trim()) {
      res.status(400).json({ error: 'question_id, question_text y answer son requeridos' });
      return;
    }

    const interview = await dbGet<Interview>('SELECT * FROM interviews WHERE id = ?', [req.params.interviewId]);
    if (!interview) {
      res.status(404).json({ error: 'Entrevista no encontrada' });
      return;
    }
    if (interview.status === 'completada') {
      res.status(409).json({ error: 'Esta entrevista ya fue completada y no se puede modificar.' });
      return;
    }

    const id = uuidv4();
    await dbRun(
      `INSERT INTO responses (id, interview_id, question_id, category, question_text, original_answer)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, req.params.interviewId, question_id, category || 'general', question_text, answer.trim()]
    );

    const candidates = detectSkillsFromText(answer);
    const existingSkills = await dbAll<{ skill: string }>(
      'SELECT skill FROM detected_skills WHERE interview_id = ?',
      [req.params.interviewId]
    );
    const existingSet = new Set(existingSkills.map((s) => s.skill));

    for (const c of candidates) {
      if (existingSet.has(c.skill)) continue;
      await dbRun(
        `INSERT INTO detected_skills (id, interview_id, skill, category, confidence, source, evidence_response_id)
         VALUES (?, ?, ?, ?, ?, 'rule', ?)`,
        [uuidv4(), req.params.interviewId, c.skill, c.category, c.confidence, id]
      );
      existingSet.add(c.skill);
    }

    const response = await dbGet('SELECT * FROM responses WHERE id = ?', [id]);
    const newSkills = await dbAll('SELECT * FROM detected_skills WHERE evidence_response_id = ?', [id]);

    res.status(201).json({
      response,
      detectedSkills: newSkills,
      vague: isAnswerVague(answer)
    });
  })
);

// Pide una pregunta de seguimiento/ejemplo. Usa IA si está disponible y dentro de límites;
// si no, usa la pregunta de seguimiento predefinida del banco (nunca simula una respuesta de IA).
responsesRouter.post(
  '/:interviewId/follow-up',
  asyncHandler(async (req, res) => {
    const { question_id, answer } = req.body as { question_id?: string; answer?: string };
    if (!question_id || !answer) {
      res.status(400).json({ error: 'question_id y answer son requeridos' });
      return;
    }

    const interview = await dbGet<Interview>('SELECT * FROM interviews WHERE id = ?', [req.params.interviewId]);
    if (!interview) {
      res.status(404).json({ error: 'Entrevista no encontrada' });
      return;
    }
    if (interview.status === 'completada') {
      res.status(409).json({ error: 'Esta entrevista ya fue completada y no se puede modificar.' });
      return;
    }

    const question = getQuestionById(question_id);
    const fallbackText = question?.followUp || '¿Puedes contarme un poco más con un ejemplo concreto?';

    if (!isAiConfigured()) {
      res.json({ question: fallbackText, source: 'template' });
      return;
    }

    try {
      const aiQuestion = await generateFollowUp(req.params.interviewId, question?.text || '', answer);
      res.json({ question: aiQuestion, source: 'ai' });
    } catch (err) {
      if (err instanceof AiLimitError) {
        res.json({ question: fallbackText, source: 'template', aiNote: err.message });
        return;
      }
      if (err instanceof AiUnavailableError) {
        res.json({ question: fallbackText, source: 'template', aiNote: 'IA no disponible en este momento.' });
        return;
      }
      throw err;
    }
  })
);
