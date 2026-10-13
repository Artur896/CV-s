# CV Construcción — Entrevistas adaptativas y generación de CV

Aplicación para entrevistar a trabajadores de la construcción (obra negra, obra blanca, acabados,
mantenimiento), detectar sus habilidades reales a partir de sus propias respuestas, y generar un
borrador de CV profesional **sin inventar información**. Usa **Groq** (API compatible con OpenAI)
como proveedor de IA opcional, con un **modo sin IA** totalmente funcional como respaldo.

## Arquitectura

- `server/`: API en Node.js + Express + TypeScript. Base de datos SQLite en desarrollo (módulo
  nativo `node:sqlite`, sin dependencias de compilación nativa) y Postgres (Supabase) en producción
  cuando hay `DATABASE_URL` configurada — ver `server/src/db/db.ts`.
- `client/`: interfaz en React + TypeScript + Vite.
- `api/index.ts`: punto de entrada para desplegar la API como función serverless en Vercel
  (reexporta la app de Express de `server/src/index.ts`).
- Todo el contenido (preguntas, interfaz, CV generado) está en español.

## Requisitos

- Node.js 22.5+ (usa el módulo experimental `node:sqlite`; se probó con Node 24).
- Sin necesidad de Visual Studio Build Tools ni compiladores nativos.

## Instalación

```bash
npm run install:all
```

Esto instala las dependencias de `server/` y `client/`. Puppeteer descargará automáticamente una
versión de Chromium (necesaria para exportar el CV a PDF).

## Configuración

Copia `server/.env.example` a `server/.env` y ajusta los valores:

```
GROQ_API_KEY=            # vacío = modo sin IA (totalmente funcional)
GROQ_MODEL=openai/gpt-oss-20b
AI_PROVIDER=groq
MAX_AI_REQUESTS_PER_INTERVIEW=8
MAX_AI_REQUESTS_PER_DAY=50
AI_TIMEOUT_MS=15000
AI_MAX_TOKENS=600
PORT=4810
DB_PATH=./data/app.sqlite
```

La clave de Groq **solo** se usa en el backend (`GroqService.ts`), nunca se expone al navegador.

> Nota sobre modelos de Groq: la lista de modelos disponibles cambia con el tiempo y depende de la
> cuenta. Si `GROQ_MODEL` da error "model_not_found", consulta los modelos vigentes con tu clave:
> `GET https://api.groq.com/openai/v1/models` (header `Authorization: Bearer <tu clave>`) y ajusta
> la variable de entorno. La app sigue funcionando en modo plantilla si el modelo configurado falla.

## Ejecutar en desarrollo

```bash
npm run dev
```

Levanta el backend en `http://localhost:4810` y el frontend en `http://localhost:5810` (con proxy
de `/api` hacia el backend).

## Pruebas automatizadas

```bash
npm test             # backend + frontend
npm run test:server  # solo backend (Jest + Supertest)
npm run test:client  # solo frontend (Vitest + React Testing Library)
```

Incluyen: reglas de detección de habilidades, banco de preguntas, límites de consumo de IA,
`GroqService` con llamadas simuladas (éxito, error HTTP, timeout, límite alcanzado), flujo completo
de entrevista en modo sin IA, y componentes de React (banner de modo sin IA, flujo de entrevista).

## Flujo de uso

1. **Candidatos**: crear un candidato nuevo.
2. **Entrevista**: preguntas predefinidas por etapa (experiencia, herramientas, acabados, resolución
   de problemas, trabajo en equipo, seguridad, preferencias). Si una respuesta es muy breve o
   genérica, se puede pedir un ejemplo (usa IA si está disponible y dentro de los límites; si no,
   usa una pregunta de seguimiento predefinida).
3. **Habilidades**: se detectan automáticamente por reglas de palabras clave (editable en
   `server/src/services/ruleBasedSkills.ts`), sin necesidad de IA.
4. **Generar CV**: un solo botón genera el perfil, los puestos sugeridos y una redacción
   profesional por respuesta — con IA (una sola llamada combinada) o con plantillas si no hay IA.
5. **Revisión**: el entrevistador edita y aprueba cada redacción antes de incluirla en el CV final.
6. **Exportar**: descarga el CV en PDF (generado con Puppeteer a partir de una plantilla HTML).

## Control de costos de IA

- Las preguntas base nunca usan IA; solo los seguimientos ante respuestas vagas y la generación del
  CV (una llamada combinada, no una por respuesta).
- Límites configurables por entrevista y por día (`MAX_AI_REQUESTS_PER_INTERVIEW`,
  `MAX_AI_REQUESTS_PER_DAY`), con registro de uso en la tabla `ai_usage_log`.
- `GET /api/ai/status` expone el consumo actual; el frontend muestra un aviso cuando la IA no está
  configurada o se alcanzó el límite.
- Ninguna respuesta se presenta como generada por IA si la llamada falló o no estaba disponible.

## Modo sin IA

Si `GROQ_API_KEY` está vacío, la llamada falla, hay timeout, o se alcanza el límite de uso, la app
sigue funcionando por completo: preguntas de seguimiento predefinidas, habilidades por reglas, y CV
generado por plantilla (reescritura simple + resumen de perfil basado en las categorías y
habilidades detectadas). Nunca se simula una respuesta de IA.

## Despliegue en Vercel + Supabase

1. **Crear el proyecto en Supabase** (https://supabase.com) y copiar el connection string de
   **Settings → Database → Connection pooling** (modo *transaction*, puerto `6543`). Las funciones
   serverless de Vercel abren muchas conexiones cortas; el pooler evita agotar las conexiones
   directas de Postgres. El esquema de tablas se crea solo en el primer request
   (`server/src/db/schema.postgres.sql`, ejecutado por `ensureSchema()`); no hace falta correr
   migraciones a mano.
2. **Importar el repositorio en Vercel** (https://vercel.com/new). El `vercel.json` de la raíz ya
   configura todo lo necesario:
   - `installCommand`/`buildCommand`: instala `server/` y `client/`, y compila el frontend
     (`client/dist`).
   - La API se despliega como función serverless desde `api/index.ts` (el builder nativo de Node de
     Vercel compila el TypeScript y empaqueta las dependencias automáticamente), con las peticiones
     a `/api/*` enrutadas ahí (`rewrites`).
   - El resto de rutas caen al `index.html` del cliente (SPA con React Router).

   > Nota: Vercel también ofrece un modelo más nuevo de "services" (múltiples builds independientes
   > en un mismo proyecto). Se probó para este repo y el servicio `server` no empaquetaba
   > `node_modules` correctamente (error `Cannot find module 'express'` en runtime), así que se usa
   > el modelo clásico de función única, que es el soportado de forma estable.
3. **Variables de entorno en Vercel** (Project Settings → Environment Variables):
   ```
   DATABASE_URL=<connection string del pooler de Supabase>
   GROQ_API_KEY=            # opcional, vacío = modo sin IA
   GROQ_MODEL=openai/gpt-oss-20b
   AI_PROVIDER=groq
   MAX_AI_REQUESTS_PER_INTERVIEW=8
   MAX_AI_REQUESTS_PER_DAY=50
   AI_TIMEOUT_MS=15000
   AI_MAX_TOKENS=600
   ```
   `PORT` y `DB_PATH` no aplican en Vercel (no hay `app.listen` ni filesystem persistente).
4. **Generación de PDF en producción**: en Vercel se usa `puppeteer-core` + `@sparticuz/chromium`
   (Chromium optimizado para entornos serverless) en vez del Chromium completo que descarga
   `puppeteer` en desarrollo — ver `server/src/services/cvTemplate.ts`. Si el PDF tarda más de los
   `maxDuration` configurados (30s en `vercel.json`), hay que subirlo según el plan de Vercel
   (Hobby: hasta 60s; Pro: hasta 300s).

## Limitaciones conocidas

- La detección de habilidades por reglas usa una lista de palabras clave fija (ver
  `ruleBasedSkills.ts`); puede no cubrir todos los oficios o regionalismos — es fácil de ampliar.
- La redacción profesional generada (con o sin IA) siempre debe ser revisada por el entrevistador
  antes de aprobarla; la app está diseñada para eso, no para generar un CV final sin supervisión.
- Puppeteer requiere descargar Chromium (~300 MB) en la instalación; en equipos con poca memoria
  disponible, la generación del PDF puede ser más lenta.
- No hay autenticación/login (uso pensado para un solo entrevistador/instancia local). Si se
  necesita multiusuario en el futuro, habría que agregar una capa de autenticación.
- El modelo de Groq por defecto (`GROQ_MODEL`) puede quedar obsoleto si el proveedor retira el
  modelo; en ese caso la app cae automáticamente a modo plantilla y lo reporta en
  `GET /api/ai/status` (`lastError`).
