import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AiStatus } from '../types';

interface Props {
  interviewId?: string;
}

export function OfflineBanner({ interviewId }: Props) {
  const [status, setStatus] = useState<AiStatus | null>(null);

  useEffect(() => {
    let active = true;
    api
      .getAiStatus(interviewId)
      .then((s) => {
        if (active) setStatus(s);
      })
      .catch(() => {
        if (active) setStatus(null);
      });
    return () => {
      active = false;
    };
  }, [interviewId]);

  if (!status) return null;

  if (!status.configured) {
    return (
      <div className="banner" role="status">
        Modo sin IA: Groq no está configurado. La app usa preguntas y CV por plantilla, sin inventar información.
      </div>
    );
  }

  if (status.usedToday >= status.limitPerDay) {
    return (
      <div className="banner" role="status">
        Se alcanzó el límite diario de solicitudes a la IA ({status.limitPerDay}). Se usará el modo por plantilla
        hasta el siguiente día.
      </div>
    );
  }

  return null;
}
