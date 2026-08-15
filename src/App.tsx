import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './features/auth/components/RequireAuth';
import { BookAppointmentPage } from './pages/BookAppointmentPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { ModeratorDashboardPage } from './pages/ModeratorDashboardPage';
import { PatientDashboardPage } from './pages/PatientDashboardPage';
import { ProfessionalDashboardPage } from './pages/ProfessionalDashboardPage';
import { ProfessionalRegisterPage } from './pages/ProfessionalRegisterPage';
import { ProfessionalProfilePage } from './pages/ProfessionalProfilePage';
import { ProfessionalSchedulePage } from './pages/ProfessionalSchedulePage';
import { PatientProfilePage } from './pages/PatientProfilePage';
import { RegisterPage } from './pages/RegisterPage';

function App() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/ingresar" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterPage />} />
      <Route path="/registro/profesional" element={<ProfessionalRegisterPage />} />
      <Route path="/perfil" element={<ProfessionalProfilePage />} />
      <Route path="/perfil/paciente" element={<PatientProfilePage />} />

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
      {/* La agenda es del profesional: va protegida por rol, a diferencia de
          /perfil, que quedó público por la deuda que arrastra ENG-48. */}
      <Route
        path="/profesional/agenda"
        element={
          <RequireAuth allow={['PROFESIONAL']}>
            <ProfessionalSchedulePage />
          </RequireAuth>
        }
      />
      {/* Reservar un turno con un profesional (ENG-54). Solo PACIENTE: es la
          historia "como paciente autenticado". Se entra desde el catálogo
          (ENG-49) o el perfil público (ENG-50), los dos en revisión. */}
      <Route
        path="/profesionales/:professionalId/turnos"
        element={
          <RequireAuth allow={['PACIENTE']}>
            <BookAppointmentPage />
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
