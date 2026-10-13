import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbGet, dbAll, dbRun } from '../db/db';
import { asyncHandler } from '../middleware/errorHandler';
import { isAiConfigured } from '../config/env';
import { rewriteAndBuildProfile, AiUnavailableError } from '../services/GroqService';
import { AiLimitError } from '../services/rateLimiter';
import { templateRewrite, templateProfileSummary } from '../services/templateCvGenerator';
import { suggestRolesFromSkills } from '../services/ruleBasedSkills';
import { buildCvHtml, renderCvPdf } from '../services/cvTemplate';
import { Candidate, CvDraft, DetectedSkill, Interview, ResponseRow } from '../types';

export const cvRouter = Router();

async function getInterviewOr404(
  interviewId: string,
  res: import('express').Response
): Promise<Interview | null> {
  const interview = await dbGet<Interview>('SELECT * FROM interviews WHERE id = ?', [interviewId]);
  if (!interview) {
    res.status(404).json({ error: 'Entrevista no encontrada' });
    return null;
  }
  return interview;
}

cvRouter.post(
  '/:interviewId/cv/generate',
  asyncHandler(async (req, res) => {
    const interview = await getInterviewOr404(req.params.interviewId, res);
    if (!interview) return;

    const { useAi } = req.body as { useAi?: boolean };

    const responses = await dbAll<ResponseRow>(
      'SELECT * FROM responses WHERE interview_id = ? ORDER BY created_at ASC',
      [req.params.interviewId]
    );

    if (responses.length === 0) {
      res.status(400).json({ error: 'La entrevista no tiene respuestas todavía' });
      return;
    }

    const skillRows = await dbAll<DetectedSkill>('SELECT * FROM detected_skills WHERE interview_id = ?', [
      req.params.interviewId
    ]);
    const skillNames = skillRows.map((s) => s.skill);

    let profileSummary = '';
    let suggestedRoles: string[] = [];
    let generationSource: 'ai' | 'template' = 'template';
    let aiNote: string | null = null;
    const rewritesByResponseId = new Map<string, string>();

    const wantsAi = Boolean(useAi) && isAiConfigured();

    if (wantsAi) {
      try {
        const result = await rewriteAndBuildProfile(req.params.interviewId, responses, skillNames);
        for (const r of result.rewrites) {
          rewritesByResponseId.set(r.responseId, r.professionalRewrite);
        }
        profileSummary = result.profileSummary;
        suggestedRoles = result.suggestedRoles.length > 0 ? result.suggestedRoles : suggestRolesFromSkills(skillNames);
        generationSource = 'ai';
      } catch (err) {
        if (err instanceof AiLimitError || err instanceof AiUnavailableError) {
          aiNote = err.message;
        } else {
          throw err;
        }
      }
    }

    if (generationSource === 'template') {
      for (const r of responses) {
        rewritesByResponseId.set(r.id, templateRewrite(r.original_answer));
      }
      profileSummary = templateProfileSummary(responses, skillNames);
      suggestedRoles = suggestRolesFromSkills(skillNames);
    }

    for (const [responseId, text] of rewritesByResponseId.entries()) {
      await dbRun(
        `UPDATE responses SET professional_rewrite = ?, rewrite_approved = 0, source_of_rewrite = ? WHERE id = ?`,
        [text, generationSource, responseId]
      );
    }

    const existingDraft = await dbGet<CvDraft>('SELECT * FROM cv_drafts WHERE interview_id = ?', [
      req.params.interviewId
    ]);

    const rolesJson = JSON.stringify(suggestedRoles);

    if (existingDraft) {
      await dbRun(
        `UPDATE cv_drafts SET profile_summary = ?, suggested_roles_json = ?, generation_source = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [profileSummary, rolesJson, generationSource, existingDraft.id]
      );
    } else {
      await dbRun(
        `INSERT INTO cv_drafts (id, interview_id, profile_summary, suggested_roles_json, generation_source)
         VALUES (?, ?, ?, ?, ?)`,
        [uuidv4(), req.params.interviewId, profileSummary, rolesJson, generationSource]
      );
    }

    const draft = await dbGet('SELECT * FROM cv_drafts WHERE interview_id = ?', [req.params.interviewId]);
    res.json({ draft, generationSource, aiNote });
  })
);

cvRouter.get(
  '/:interviewId/cv',
  asyncHandler(async (req, res) => {
    const draft = await dbGet('SELECT * FROM cv_drafts WHERE interview_id = ?', [req.params.interviewId]);
    if (!draft) {
      res.status(404).json({ error: 'Todavía no se ha generado un CV para esta entrevista' });
      return;
    }
    const responses = await dbAll('SELECT * FROM responses WHERE interview_id = ? ORDER BY created_at ASC', [
      req.params.interviewId
    ]);
    const skills = await dbAll('SELECT * FROM detected_skills WHERE interview_id = ?', [req.params.interviewId]);
    res.json({ draft, responses, skills });
  })
);

cvRouter.patch(
  '/:interviewId/cv/responses/:responseId',
  asyncHandler(async (req, res) => {
    const { professional_rewrite, approved } = req.body as {
      professional_rewrite?: string;
      approved?: boolean;
    };
    const existing = await dbGet<ResponseRow>('SELECT * FROM responses WHERE id = ? AND interview_id = ?', [
      req.params.responseId,
      req.params.interviewId
    ]);
    if (!existing) {
      res.status(404).json({ error: 'Respuesta no encontrada' });
      return;
    }

    await dbRun(`UPDATE responses SET professional_rewrite = ?, rewrite_approved = ? WHERE id = ?`, [
      professional_rewrite ?? existing.professional_rewrite,
      approved === undefined ? existing.rewrite_approved : approved ? 1 : 0,
      req.params.responseId
    ]);

    const updated = await dbGet('SELECT * FROM responses WHERE id = ?', [req.params.responseId]);
    res.json(updated);
  })
);

cvRouter.get(
  '/:interviewId/cv/pdf',
  asyncHandler(async (req, res) => {
    const interview = await dbGet<Interview>('SELECT * FROM interviews WHERE id = ?', [req.params.interviewId]);
    if (!interview) {
      res.status(404).json({ error: 'Entrevista no encontrada' });
      return;
    }

    const candidate = await dbGet<Candidate>('SELECT * FROM candidates WHERE id = ?', [interview.candidate_id]);
    const draft = await dbGet<CvDraft>('SELECT * FROM cv_drafts WHERE interview_id = ?', [req.params.interviewId]);

    if (!candidate || !draft) {
      res.status(400).json({ error: 'No hay un CV generado para exportar todavía' });
      return;
    }

    const responses = await dbAll<ResponseRow>(
      'SELECT * FROM responses WHERE interview_id = ? ORDER BY created_at ASC',
      [req.params.interviewId]
    );
    const skills = await dbAll<DetectedSkill>('SELECT * FROM detected_skills WHERE interview_id = ?', [
      req.params.interviewId
    ]);
    const suggestedRoles: string[] = draft.suggested_roles_json ? JSON.parse(draft.suggested_roles_json) : [];

    const html = buildCvHtml({ candidate, draft, responses, skills, suggestedRoles });
    const pdfBuffer = await renderCvPdf(html);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="cv-${candidate.full_name.replace(/\s+/g, '_')}.pdf"`);
    res.send(pdfBuffer);
  })
);
