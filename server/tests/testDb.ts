import fs from 'fs';
import path from 'path';

const dbPath = process.env.DB_PATH || './data/test.sqlite';

export function resetTestDb(): void {
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    const p = path.resolve(dbPath + suffix);
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {
      // Ignorar: en Windows el archivo puede seguir bloqueado brevemente tras cerrar la conexión.
      // Cada archivo de test usa una base de datos única (ver setupEnv.ts), así que no afecta los resultados.
    }
  }
}
