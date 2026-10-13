import { resetTestDb } from './testDb';

resetTestDb();

import { getDb, closeDb } from '../src/db/db';
import { assertWithinLimits, AiLimitError, getUsedToday, getUsedForInterview } from '../src/services/rateLimiter';
import { v4 as uuidv4 } from 'uuid';

function insertUsage(interviewId: string | null, success: boolean) {
  const db = getDb();
  db.prepare(
    `INSERT INTO ai_usage_log (id, interview_id, call_type, success) VALUES (?, ?, 'test', ?)`
  ).run(uuidv4(), interviewId, success ? 1 : 0);
}

describe('rateLimiter', () => {
  afterAll(() => {
    closeDb();
    resetTestDb();
  });

  it('permite llamadas mientras no se supere el límite', () => {
    expect(() => assertWithinLimits(null)).not.toThrow();
  });

  it('bloquea cuando se alcanza el límite por entrevista (3 en tests)', () => {
    const interviewId = uuidv4();
    insertUsage(interviewId, true);
    insertUsage(interviewId, true);
    insertUsage(interviewId, true);

    expect(() => assertWithinLimits(interviewId)).toThrow(AiLimitError);
    expect(getUsedForInterview(interviewId)).toBe(3);
  });

  it('bloquea cuando se alcanza el límite diario (5 en tests)', () => {
    for (let i = 0; i < 5; i++) insertUsage(uuidv4(), true);
    expect(getUsedToday()).toBeGreaterThanOrEqual(5);
    expect(() => assertWithinLimits(null)).toThrow(AiLimitError);
  });
});
