import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { ensureSchema } from './db/db';
import { errorHandler, asyncHandler } from './middleware/errorHandler';
import { candidatesRouter } from './routes/candidates';
import { interviewsRouter } from './routes/interviews';
import { responsesRouter } from './routes/responses';
import { skillsRouter } from './routes/skills';
import { cvRouter } from './routes/cv';
import { aiRouter } from './routes/ai';

const app = express();

app.disable('x-powered-by');
app.use(cors(env.CORS_ORIGIN ? { origin: env.CORS_ORIGIN } : undefined));
app.use(express.json({ limit: '1mb' }));

// Se espera (memoizado) en cada request: en local/sqlite ya está listo de forma síncrona,
// en producción (Postgres/Supabase) la primera llamada crea el esquema antes de atender nada.
app.use(
  asyncHandler(async (_req, _res, next) => {
    await ensureSchema();
    next();
  })
);

app.use('/api/candidates', candidatesRouter);
app.use('/api/interviews', interviewsRouter);
app.use('/api/interviews', responsesRouter);
app.use('/api/interviews', skillsRouter);
app.use('/api/interviews', cvRouter);
app.use('/api/ai', aiRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler);

if (require.main === module) {
  app.listen(env.PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${env.PORT}`);
    console.log(`Modo IA: ${env.GROQ_API_KEY ? 'Groq configurado' : 'SIN IA (modo plantilla)'}`);
  });
}

export default app;
