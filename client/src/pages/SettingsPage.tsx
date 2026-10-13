import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AiStatus } from '../types';

export function SettingsPage() {
  const [status, setStatus] = useState<AiStatus | null>(null);

  useEffect(() => {
    api.getAiStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  return (
    <div className="card">
      <h1>Configuración e IA</h1>
      {!status && <p className="muted">Cargando estado de la IA...</p>}
      {status && (
        <>
          <p>
            <strong>Proveedor:</strong> Groq (API compatible con OpenAI)
          </p>
          <p>
            <strong>Estado:</strong>{' '}
            {status.configured ? 'Configurado (GROQ_API_KEY presente)' : 'No configurado — modo sin IA activo'}
          </p>
          <p>
            <strong>Uso hoy:</strong> {status.usedToday} / {status.limitPerDay} solicitudes
          </p>
          <p>
            <strong>Límite por entrevista:</strong> {status.limitPerInterview} solicitudes
          </p>
          {status.lastError && (
            <p className="error-text">
              <strong>Último error de IA:</strong> {status.lastError}
            </p>
          )}
          <hr />
          <p className="muted">
            La clave de la IA se configura únicamente en el backend, mediante la variable de entorno
            <code> GROQ_API_KEY</code> en <code>server/.env</code>. Nunca se expone al navegador.
          </p>
        </>
      )}
    </div>
  );
}
