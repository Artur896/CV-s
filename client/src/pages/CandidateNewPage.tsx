import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client';

export function CandidateNewPage() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const candidate = await api.createCandidate({ full_name: fullName.trim(), phone, notes });
      navigate('/', { state: { createdId: candidate.id } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar el candidato');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <h1>Nuevo candidato</h1>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="full_name">Nombre completo</label>
          <input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="phone">Teléfono (opcional)</label>
          <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="notes">Notas del entrevistador (opcional)</label>
          <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button className="btn" type="submit" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar candidato'}
        </button>
      </form>
    </div>
  );
}
