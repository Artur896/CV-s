import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { CvDraft, DetectedSkill, ResponseRow } from '../types';
import { OfflineBanner } from '../components/OfflineBanner';

export function CvReviewPage() {
  const { interviewId } = useParams<{ interviewId: string }>();

  const [draft, setDraft] = useState<CvDraft | null>(null);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [skills, setSkills] = useState<DetectedSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [useAi, setUseAi] = useState(true);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const load = useCallback(() => {
    if (!interviewId) return;
    setLoading(true);

    Promise.all([api.getSkills(interviewId), api.getAiStatus(interviewId)])
      .then(([skillsRes, aiStatus]) => {
        setSkills(skillsRes);
        setAiConfigured(aiStatus.configured);
      })
      .catch(() => undefined);

    api
      .getResponses(interviewId)
      .then(setResponses)
      .catch((e: ApiError) => setError(e.message))
      .finally(() => setLoading(false));

    api
      .getCv(interviewId)
      .then((res) => {
        setDraft(res.draft);
        setResponses(res.responses);
      })
      .catch(() => {
        setDraft(null);
      });
  }, [interviewId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleGenerate() {
    if (!interviewId) return;
    setGenerating(true);
    setError(null);
    setAiNote(null);
    try {
      const res = await api.generateCv(interviewId, useAi);
      setAiNote(res.aiNote);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo generar el CV');
    } finally {
      setGenerating(false);
    }
  }

  async function handleDeleteSkill(skillId: string) {
    if (!interviewId) return;
    try {
      await api.deleteSkill(interviewId, skillId);
      setSkills((prev) => prev.filter((s) => s.id !== skillId));
    } catch {
      setError('No se pudo quitar la habilidad');
    }
  }

  function startEditing(r: ResponseRow) {
    setEditingId(r.id);
    setEditingText(r.professional_rewrite || r.original_answer);
  }

  async function saveEditing(responseId: string, approve: boolean) {
    if (!interviewId) return;
    try {
      const updated = await api.updateCvResponse(interviewId, responseId, {
        professional_rewrite: editingText,
        approved: approve
      });
      setResponses((prev) => prev.map((r) => (r.id === responseId ? updated : r)));
      setEditingId(null);
    } catch {
      setError('No se pudo guardar la edición');
    }
  }

  const suggestedRoles: string[] = draft?.suggested_roles_json ? JSON.parse(draft.suggested_roles_json) : [];

  if (loading) return <div className="card">Cargando...</div>;

  return (
    <div>
      <OfflineBanner interviewId={interviewId} />

      <div className="card">
        <h1>Habilidades detectadas</h1>
        {skills.length === 0 && <p className="muted">Todavía no se detectaron habilidades.</p>}
        {skills.map((s) => (
          <span className="badge" key={s.id}>
            {s.skill}{' '}
            <button
              onClick={() => handleDeleteSkill(s.id)}
              style={{ border: 'none', background: 'none', color: '#1d4ed8', cursor: 'pointer' }}
              title="Quitar esta habilidad"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="card">
        <h1>Respuestas de la entrevista</h1>
        {responses.length === 0 && <p className="muted">Esta entrevista todavía no tiene respuestas.</p>}
        {responses.map((r) => (
          <div
            key={r.id}
            className="response-edit"
            style={{ marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid #e5e7eb' }}
          >
            <div className="muted">{r.category}</div>
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{r.question_text}</div>
            <p style={{ marginTop: 6 }}>{r.original_answer}</p>

            {draft && (
              <>
                {editingId === r.id ? (
                  <>
                    <div className="muted" style={{ marginTop: 10 }}>Redacción profesional (editable):</div>
                    <textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} />
                    <button className="btn" onClick={() => saveEditing(r.id, true)} style={{ marginTop: 6, marginRight: 8 }}>
                      Guardar y aprobar
                    </button>
                    <button className="btn btn-secondary" onClick={() => setEditingId(null)} style={{ marginTop: 6 }}>
                      Cancelar
                    </button>
                  </>
                ) : (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e5e7eb' }}>
                    <div className="muted">Redacción profesional:</div>
                    <p>{r.professional_rewrite || '(sin redacción todavía)'}</p>
                    <span className="muted">{r.rewrite_approved ? 'Aprobado ✓' : 'Pendiente de aprobar'}</span>{' '}
                    <button className="btn btn-secondary" onClick={() => startEditing(r)} style={{ marginLeft: 8 }}>
                      Editar
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <h1>Generar CV</h1>
        <div className="field">
          <label>
            <input
              type="checkbox"
              checked={useAi}
              onChange={(e) => setUseAi(e.target.checked)}
              disabled={!aiConfigured}
              style={{ width: 'auto', marginRight: 8 }}
            />
            Usar IA (Groq) para redactar el perfil {aiConfigured ? '' : '(no disponible: configura GROQ_API_KEY)'}
          </label>
        </div>
        <button className="btn" onClick={handleGenerate} disabled={generating || responses.length === 0}>
          {generating ? 'Generando...' : draft ? 'Regenerar CV' : 'Generar CV'}
        </button>
        {responses.length === 0 && <p className="muted">Completa la entrevista antes de generar el CV.</p>}
        {aiNote && <p className="muted">Nota de IA: {aiNote}</p>}
        {error && <div className="error-text">{error}</div>}
      </div>

      {draft && (
        <>
          <div className="card">
            <h1>Perfil profesional</h1>
            <p>{draft.profile_summary}</p>
            <h2>Puestos compatibles</h2>
            {suggestedRoles.map((r) => (
              <div key={r} className="muted">
                • {r}
              </div>
            ))}
            <p className="muted" style={{ marginTop: 10 }}>
              Fuente: {draft.generation_source === 'ai' ? 'Groq (IA)' : 'Plantilla (sin IA)'}
            </p>
          </div>

          <div className="card">
            <h1>Exportar</h1>
            <a className="btn" style={{ textDecoration: 'none', display: 'inline-block' }} href={api.cvPdfUrl(interviewId!)}>
              Descargar CV en PDF
            </a>
          </div>
        </>
      )}
    </div>
  );
}
