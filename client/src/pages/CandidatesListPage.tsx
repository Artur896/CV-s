import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { Candidate, Interview } from '../types';

export function CandidatesListPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [latestInterview, setLatestInterview] = useState<Record<string, Interview | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .listCandidates()
      .then(async (list) => {
        setCandidates(list);
        const entries = await Promise.all(
          list.map(async (c) => {
            const interviews = await api.listInterviews(c.id).catch(() => []);
            return [c.id, interviews[0] || null] as const;
          })
        );
        setLatestInterview(Object.fromEntries(entries));
      })
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function startInterview(candidateId: string) {
    setStarting(candidateId);
    setError(null);
    try {
      const interview = await api.createInterview(candidateId);
      navigate(`/interviews/${interview.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo comenzar');
      setStarting(null);
    }
  }

  return (
    <div>
      <div className="card">
        <h1>Candidatos</h1>
        <Link to="/candidates/new" className="btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
          + Nuevo candidato
        </Link>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div className="card">
        {loading && <p className="muted">Cargando...</p>}
        {!loading && candidates.length === 0 && <p className="muted">Todavía no hay candidatos registrados.</p>}
        {candidates.map((c) => {
          const interview = latestInterview[c.id];
          return (
            <div className="list-item" key={c.id}>
              <div>
                <strong>{c.full_name}</strong>
                {c.phone && <div className="muted">{c.phone}</div>}
              </div>
              {interview?.status === 'completada' && <span className="muted">Completado ✓</span>}
              {interview?.status === 'en_progreso' && (
                <button className="btn btn-secondary" onClick={() => navigate(`/interviews/${interview.id}`)}>
                  Continuar
                </button>
              )}
              {!interview && (
                <button className="btn" onClick={() => startInterview(c.id)} disabled={starting === c.id}>
                  {starting === c.id ? 'Iniciando...' : 'Comenzar'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
