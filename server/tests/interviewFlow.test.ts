import { resetTestDb } from './testDb';

resetTestDb();

import request from 'supertest';
import app from '../src/index';
import { closeDb } from '../src/db/db';
import { QUESTION_BANK } from '../src/services/questionBank';

describe('Flujo de entrevista en modo sin IA', () => {
  afterAll(() => {
    closeDb();
    resetTestDb();
  });

  it('completa candidato -> entrevista -> respuestas -> habilidades -> CV en modo plantilla', async () => {
    const candidateRes = await request(app)
      .post('/api/candidates')
      .send({ full_name: 'María López', phone: '555-9999' });
    expect(candidateRes.status).toBe(201);
    const candidateId = candidateRes.body.id;

    const interviewRes = await request(app).post('/api/interviews').send({ candidate_id: candidateId });
    expect(interviewRes.status).toBe(201);
    const interviewId = interviewRes.body.id;

    // Responder todas las preguntas del banco en orden de categoría
    for (let i = 0; i < QUESTION_BANK.length; i++) {
      const nextRes = await request(app).get(`/api/interviews/${interviewId}/next-question`);
      expect(nextRes.status).toBe(200);
      if (nextRes.body.completed) break;

      const question = nextRes.body.question;
      expect(question).toBeTruthy();

      const answer =
        question.category === 'herramientas'
          ? 'Uso taladro y nivel para medidas exactas en cada corte que hago'
          : 'Tengo experiencia trabajando en equipo y resolviendo problemas de obra con cuidado';

      const answerRes = await request(app)
        .post(`/api/interviews/${interviewId}/responses`)
        .send({
          question_id: question.id,
          category: question.category,
          question_text: question.text,
          answer
        });
      expect(answerRes.status).toBe(201);
    }

    const finalNext = await request(app).get(`/api/interviews/${interviewId}/next-question`);
    expect(finalNext.body.completed).toBe(true);

    const skillsRes = await request(app).get(`/api/interviews/${interviewId}/skills`);
    expect(skillsRes.status).toBe(200);
    expect(skillsRes.body.length).toBeGreaterThan(0);

    const cvGenRes = await request(app).post(`/api/interviews/${interviewId}/cv/generate`).send({ useAi: false });
    expect(cvGenRes.status).toBe(200);
    expect(cvGenRes.body.generationSource).toBe('template');

    const cvRes = await request(app).get(`/api/interviews/${interviewId}/cv`);
    expect(cvRes.status).toBe(200);
    expect(cvRes.body.draft.profile_summary).toBeTruthy();
    expect(cvRes.body.responses.length).toBe(QUESTION_BANK.length);

    const firstResponseId = cvRes.body.responses[0].id;
    const patchRes = await request(app)
      .patch(`/api/interviews/${interviewId}/cv/responses/${firstResponseId}`)
      .send({ approved: true });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.rewrite_approved).toBe(1);
  });

  it('responde ai_unavailable al pedir CV con IA sin GROQ_API_KEY configurada (cae a plantilla)', async () => {
    const candidateRes = await request(app).post('/api/candidates').send({ full_name: 'Pedro Ruiz' });
    const interviewRes = await request(app)
      .post('/api/interviews')
      .send({ candidate_id: candidateRes.body.id });
    const interviewId = interviewRes.body.id;

    const q = QUESTION_BANK[0];
    await request(app)
      .post(`/api/interviews/${interviewId}/responses`)
      .send({ question_id: q.id, category: q.category, question_text: q.text, answer: 'Trabajo en obra negra' });

    const cvGenRes = await request(app).post(`/api/interviews/${interviewId}/cv/generate`).send({ useAi: true });
    expect(cvGenRes.status).toBe(200);
    expect(cvGenRes.body.generationSource).toBe('template');
  });

  it('permite pedir un seguimiento mientras la entrevista sigue activa', async () => {
    const candidateRes = await request(app).post('/api/candidates').send({ full_name: 'Sofía Ramírez' });
    const interviewRes = await request(app)
      .post('/api/interviews')
      .send({ candidate_id: candidateRes.body.id });
    const interviewId = interviewRes.body.id;

    const followUpRes = await request(app)
      .post(`/api/interviews/${interviewId}/follow-up`)
      .send({ question_id: QUESTION_BANK[0].id, answer: 'poco' });
    expect(followUpRes.status).toBe(200);
    expect(followUpRes.body.source).toBe('template');
  });

  it('bloquea nuevas respuestas y seguimientos una vez que la entrevista está completada', async () => {
    const candidateRes = await request(app).post('/api/candidates').send({ full_name: 'Luis Torres' });
    const interviewRes = await request(app)
      .post('/api/interviews')
      .send({ candidate_id: candidateRes.body.id });
    const interviewId = interviewRes.body.id;

    for (const q of QUESTION_BANK) {
      await request(app)
        .post(`/api/interviews/${interviewId}/responses`)
        .send({ question_id: q.id, category: q.category, question_text: q.text, answer: 'Respuesta de prueba detallada con varias palabras' });
    }

    const nextRes = await request(app).get(`/api/interviews/${interviewId}/next-question`);
    expect(nextRes.body.completed).toBe(true);

    const blockedResponse = await request(app)
      .post(`/api/interviews/${interviewId}/responses`)
      .send({
        question_id: QUESTION_BANK[0].id,
        category: QUESTION_BANK[0].category,
        question_text: QUESTION_BANK[0].text,
        answer: 'Intento de respuesta tardía'
      });
    expect(blockedResponse.status).toBe(409);

    const blockedFollowUp = await request(app)
      .post(`/api/interviews/${interviewId}/follow-up`)
      .send({ question_id: QUESTION_BANK[0].id, answer: 'poco' });
    expect(blockedFollowUp.status).toBe(409);
  });
});
