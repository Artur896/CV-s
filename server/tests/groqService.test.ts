import { resetTestDb } from './testDb';

describe('GroqService', () => {
  beforeEach(() => {
    jest.resetModules();
    resetTestDb();
    process.env.GROQ_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete (global as any).fetch;
  });

  it('lanza AiUnavailableError si no hay GROQ_API_KEY configurada', async () => {
    jest.resetModules();
    process.env.GROQ_API_KEY = '';
    const { generateFollowUp, AiUnavailableError } = require('../src/services/GroqService');
    await expect(generateFollowUp('interview-1', '¿Qué herramientas usas?', 'poco')).rejects.toBeInstanceOf(
      AiUnavailableError
    );
  });

  it('devuelve la pregunta generada cuando Groq responde correctamente', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '¿Me puedes dar un ejemplo?' } }] })
    });

    const { generateFollowUp } = require('../src/services/GroqService');
    const result = await generateFollowUp('interview-1', '¿Qué herramientas usas?', 'uso taladro');
    expect(result).toBe('¿Me puedes dar un ejemplo?');
    expect((global as any).fetch).toHaveBeenCalledTimes(1);
  });

  it('lanza AiUnavailableError cuando Groq responde con error HTTP', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'unauthorized'
    });

    const { generateFollowUp, AiUnavailableError } = require('../src/services/GroqService');
    await expect(generateFollowUp('interview-1', 'pregunta', 'respuesta')).rejects.toBeInstanceOf(
      AiUnavailableError
    );
  });

  it('registra el intento fallido en el log de uso', async () => {
    (global as any).fetch = jest.fn().mockRejectedValue(new Error('network error'));

    const { generateFollowUp } = require('../src/services/GroqService');
    await expect(generateFollowUp('interview-1', 'pregunta', 'respuesta')).rejects.toThrow();

    const { getDb } = require('../src/db/db');
    const db = getDb();
    const row = db.prepare('SELECT * FROM ai_usage_log ORDER BY created_at DESC LIMIT 1').get() as {
      success: number;
      call_type: string;
    };
    expect(row.success).toBe(0);
    expect(row.call_type).toBe('follow_up');
  });
});
