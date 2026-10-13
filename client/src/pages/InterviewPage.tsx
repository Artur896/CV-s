import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client';
import { DetectedSkill, Question } from '../types';
import { OfflineBanner } from '../components/OfflineBanner';

const CATEGORY_LABELS: Record<string, string> = {
  experiencia: 'Experiencia',
  herramientas: 'Herramientas y materiales',
  acabados: 'Acabados y medidas',
  resolucion_problemas: 'Resolución de problemas',
  trabajo_equipo: 'Trabajo en equipo',
  seguridad: 'Seguridad',
  preferencias: 'Preferencias'
};

type Phase = 'loading' | 'question' | 'followup' | 'completed' | 'error';

export function InterviewPage() {
  const { interviewId } = useParams<{ interviewId: string }>();

  const [phase, setPhase] = useState<Phase>('loading');
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState('');
  const [vague, setVague] = useState(false);
  const [followUpQuestion, setFollowUpQuestion] = useState<string | null>(null);
  const [followUpAnswer, setFollowUpAnswer] = useState('');
  const [newSkills, setNewSkills] = useState<DetectedSkill[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNextQuestion = useCallback(() => {
    if (!interviewId) return;
    setPhase('loading');
    setAnswer('');
    setVague(false);
    setFollowUpQuestion(null);
    setFollowUpAnswer('');
    setNewSkills([]);
    api
      .getNextQuestion(interviewId)
      .then((res) => {
        if (res.completed || !res.question) {
          setPhase('completed');
        } else {
          setQuestion(res.question);
          setPhase('question');
        }
      })
      .catch((e: ApiError) => {
        setError(e.message);
        setPhase('error');
      });
  }, [interviewId]);

  useEffect(() => {
    loadNextQuestion();
  }, [loadNextQuestion]);

  async function handleSubmitAnswer() {
    if (!interviewId || !question || !answer.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.submitResponse(interviewId, {
        question_id: question.id,
        category: question.category,
        question_text: question.text,
        answer: answer.trim()
      });
      setNewSkills(result.detectedSkills);
      if (result.vague) {
        setVague(true);
      } else {
        loadNextQuestion();
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar la respuesta');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAskForExample() {
    if (!interviewId || !question) return;
    setSubmitting(true);
    try {
      const res = await api.requestFollowUp(interviewId, question.id, answer);
      setFollowUpQuestion(res.question);
      setPhase('followup');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo pedir un ejemplo');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitFollowUp() {
    if (!interviewId || !question || !followUpAnswer.trim()) return;
    setSubmitting(true);
    try {
      await api.submitResponse(interviewId, {
        question_id: question.id,
        category: question.category,
        question_text: followUpQuestion || question.text,
        answer: followUpAnswer.trim()
      });
      loadNextQuestion();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar el ejemplo');
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === 'loading') {
    return <div className="card">Cargando siguiente pregunta...</div>;
  }

  if (phase === 'error') {
    return <div className="card error-text">{error}</div>;
  }

  if (phase === 'completed') {
    return (
      <div className="card">
        <h1>¡Listo!</h1>
        <p className="muted">Gracias por completar tus respuestas. Ya puedes cerrar esta ventana.</p>
      </div>
    );
  }

  return (
    <div>
      <OfflineBanner interviewId={interviewId} />

      <div className="card">
        <div className="muted" style={{ marginBottom: 8 }}>
          {question && CATEGORY_LABELS[question.category]}
        </div>
        <h1>{question?.text}</h1>

        {phase === 'question' && (
          <>
            <div className="field">
              <textarea
                rows={4}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Escribe tu respuesta aquí, con tus propias palabras..."
              />
            </div>
            {error && <div className="error-text">{error}</div>}

            {!vague && (
              <button className="btn" onClick={handleSubmitAnswer} disabled={submitting || !answer.trim()}>
                {submitting ? 'Guardando...' : 'Continuar'}
              </button>
            )}

            {vague && (
              <div style={{ marginTop: 12 }}>
                <p className="muted">
                  Tu respuesta se guardó. ¿Quieres agregar un ejemplo para que quede más completa?
                </p>
                <button className="btn" onClick={handleAskForExample} disabled={submitting} style={{ marginRight: 8 }}>
                  Agregar un ejemplo
                </button>
                <button className="btn btn-secondary" onClick={loadNextQuestion} disabled={submitting}>
                  Continuar sin agregar
                </button>
              </div>
            )}

            {newSkills.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <span className="muted">Habilidades detectadas: </span>
                {newSkills.map((s) => (
                  <span className="badge" key={s.id}>
                    {s.skill}
                  </span>
                ))}
              </div>
            )}
          </>
        )}

        {phase === 'followup' && (
          <>
            <p style={{ fontWeight: 'bold' }}>{followUpQuestion}</p>
            <div className="field">
              <textarea
                rows={3}
                value={followUpAnswer}
                onChange={(e) => setFollowUpAnswer(e.target.value)}
                placeholder="Cuenta el ejemplo aquí..."
              />
            </div>
            {error && <div className="error-text">{error}</div>}
            <button className="btn" onClick={handleSubmitFollowUp} disabled={submitting || !followUpAnswer.trim()}>
              {submitting ? 'Guardando...' : 'Guardar y continuar'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
