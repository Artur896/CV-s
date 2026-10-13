import { Link, Route, Routes } from 'react-router-dom';
import { CandidatesListPage } from './pages/CandidatesListPage';
import { CandidateNewPage } from './pages/CandidateNewPage';
import { InterviewPage } from './pages/InterviewPage';
import { CvReviewPage } from './pages/CvReviewPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminPage } from './pages/AdminPage';

export function App() {
  return (
    <div className="app-shell">
      <div className="app-header">
        <Link to="/">CV Construcción</Link>
        <div>
          <Link className="nav-link" to="/">
            Candidatos
          </Link>
          <Link className="nav-link" to="/settings">
            Configuración
          </Link>
        </div>
      </div>

      <Routes>
        <Route path="/" element={<CandidatesListPage />} />
        <Route path="/candidates/new" element={<CandidateNewPage />} />
        <Route path="/interviews/:interviewId" element={<InterviewPage />} />
        <Route path="/interviews/:interviewId/cv" element={<CvReviewPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        {/* Ruta sin enlace en la navegación: solo para el entrevistador */}
        <Route path="/respuestas" element={<AdminPage />} />
      </Routes>
    </div>
  );
}
