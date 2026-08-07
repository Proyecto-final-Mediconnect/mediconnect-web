import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './features/auth/components/RequireAuth';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { ModeratorDashboardPage } from './pages/ModeratorDashboardPage';
import { PatientDashboardPage } from './pages/PatientDashboardPage';
import { ProfessionalDashboardPage } from './pages/ProfessionalDashboardPage';
import { ProfessionalRegisterPage } from './pages/ProfessionalRegisterPage';
import { ProfessionalProfilePage } from './pages/ProfessionalProfilePage';
import { RegisterPage } from './pages/RegisterPage';

function App() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/ingresar" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterPage />} />
      <Route
        path="/registro/profesional"
        element={<ProfessionalRegisterPage />}
      />
      <Route path="/perfil" element={<ProfessionalProfilePage />} />

      {/* Privadas — un dashboard por rol (ENG-44) */}
      <Route
        path="/paciente"
        element={
          <RequireAuth allow={['PACIENTE']}>
            <PatientDashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/profesional"
        element={
          <RequireAuth allow={['PROFESIONAL']}>
            <ProfessionalDashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/moderacion"
        element={
          <RequireAuth allow={['MODERADOR']}>
            <ModeratorDashboardPage />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;