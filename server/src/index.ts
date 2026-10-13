import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { getDb } from './db/db';
import { errorHandler } from './middleware/errorHandler';
import { candidatesRouter } from './routes/candidates';
import { interviewsRouter } from './routes/interviews';
import { responsesRouter } from './routes/responses';
import { skillsRouter } from './routes/skills';
import { cvRouter } from './routes/cv';
import { aiRouter } from './routes/ai';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

getDb(); // inicializa el esquema de la base de datos al arrancar

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
