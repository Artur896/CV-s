import { resetTestDb } from './testDb';

resetTestDb();

import { dbRun, closeDb, ensureSchema } from '../src/db/db';
import { assertWithinLimits, AiLimitError, getUsedToday, getUsedForInterview } from '../src/services/rateLimiter';
import { v4 as uuidv4 } from 'uuid';

async function insertUsage(interviewId: string | null, success: boolean): Promise<void> {
  await dbRun(`INSERT INTO ai_usage_log (id, interview_id, call_type, success) VALUES (?, ?, 'test', ?)`, [
    uuidv4(),
    interviewId,
    success ? 1 : 0
  ]);
}

describe('rateLimiter', () => {
  beforeAll(async () => {
    await ensureSchema();
  });

  afterAll(() => {
    closeDb();
    resetTestDb();
  });

  it('permite llamadas mientras no se supere el límite', async () => {
    await expect(assertWithinLimits(null)).resolves.not.toThrow();
  });

  it('bloquea cuando se alcanza el límite por entrevista (3 en tests)', async () => {
    const interviewId = uuidv4();
    await insertUsage(interviewId, true);
    await insertUsage(interviewId, true);
    await insertUsage(interviewId, true);

    await expect(assertWithinLimits(interviewId)).rejects.toBeInstanceOf(AiLimitError);
    expect(await getUsedForInterview(interviewId)).toBe(3);
  });

  it('bloquea cuando se alcanza el límite diario (5 en tests)', async () => {
    for (let i = 0; i < 5; i++) await insertUsage(uuidv4(), true);
    expect(await getUsedToday()).toBeGreaterThanOrEqual(5);
    await expect(assertWithinLimits(null)).rejects.toBeInstanceOf(AiLimitError);
  });
});
