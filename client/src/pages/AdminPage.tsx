import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { Candidate, Interview } from '../types';

const STATUS_LABELS: Record<string, string> = {
  en_progreso: 'En progreso',
  completada: 'Completada'
};

export function AdminPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviewsByCandidate, setInterviewsByCandidate] = useState<Record<string, Interview[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listCandidates()
      .then(async (list) => {
        setCandidates(list);
        const entries = await Promise.all(
          list.map(async (c) => {
            const interviews = await api.listInterviews(c.id).catch(() => []);
            return [c.id, interviews] as const;
          })
        );
        setInterviewsByCandidate(Object.fromEntries(entries));
      })
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="card">
        <h1>Respuestas de candidatos</h1>
        <p className="muted">Vista solo para el entrevistador. Este enlace no aparece en la navegación.</p>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="card">
        {loading && <p className="muted">Cargando...</p>}
        {!loading && candidates.length === 0 && <p className="muted">Todavía no hay candidatos registrados.</p>}

        {candidates.map((c) => {
          const interviews = interviewsByCandidate[c.id] || [];
          return (
            <div key={c.id} style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #e5e7eb' }}>
              <strong>{c.full_name}</strong>
              {c.phone && <span className="muted"> · {c.phone}</span>}

              {interviews.length === 0 && <div className="muted">Sin entrevistas todavía.</div>}

              {interviews.map((i) => (
                <div
                  key={i.id}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}
                >
                  <span className="muted">
                    {STATUS_LABELS[i.status] || i.status} · {new Date(i.created_at).toLocaleString('es-MX')}
                  </span>
                  <Link to={`/interviews/${i.id}/cv`} className="btn btn-secondary" style={{ textDecoration: 'none' }}>
                    Ver respuestas y CV
                  </Link>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
