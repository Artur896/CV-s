process.env.GROQ_API_KEY = '';
process.env.MAX_AI_REQUESTS_PER_INTERVIEW = '3';
process.env.MAX_AI_REQUESTS_PER_DAY = '5';
process.env.AI_TIMEOUT_MS = '2000';

// Cada archivo de test usa su propia base de datos para evitar colisiones/EBUSY en Windows
// al correr los test suites en secuencia (--runInBand).
const uniqueSuffix = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
process.env.DB_PATH = `./data/test-${uniqueSuffix}.sqlite`;
