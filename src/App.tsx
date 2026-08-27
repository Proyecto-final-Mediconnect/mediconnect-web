import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './features/auth/components/RequireAuth';
import { BookAppointmentPage } from './pages/BookAppointmentPage';
import { CatalogPage } from './pages/CatalogPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { ModeratorDashboardPage } from './pages/ModeratorDashboardPage';
import { MyAppointmentsPage } from './pages/MyAppointmentsPage';
import { PatientDashboardPage } from './pages/PatientDashboardPage';
import { ProfessionalDashboardPage } from './pages/ProfessionalDashboardPage';
import { ProfessionalRegisterPage } from './pages/ProfessionalRegisterPage';
import { ProfessionalProfilePage } from './pages/ProfessionalProfilePage';
import { ProfessionalSchedulePage } from './pages/ProfessionalSchedulePage';
import { PatientProfilePage } from './pages/PatientProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { SpikeDailyPage } from './pages/SpikeDailyPage';
import { VideoConsultationPage } from './pages/VideoConsultationPage';

function App() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/" element={<LandingPage />} />
      {/* Catálogo público (ENG-49): la búsqueda de profesionales no requiere
          sesión, así que va sin guard. */}
      <Route path="/profesionales" element={<CatalogPage />} />
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
      {/* Banco de pruebas del spike de Daily (ENG-51). No es producto: se borra
          cuando ENG-56 implemente la videoconsulta desde un turno confirmado.
          Va con sesión igual, porque crear salas consume cuota de Daily. */}
      <Route
        path="/spike/daily"
        element={
          <RequireAuth allow={['PACIENTE', 'PROFESIONAL']}>
            <SpikeDailyPage />
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
      {/* Mis turnos (ENG-55). Los dos roles, una sola ruta: `/appointments/me`
          devuelve los turnos donde el usuario es paciente o profesional. El
          MODERADOR no entra porque no tiene turnos propios. */}
      <Route
        path="/mis-turnos"
        element={
          <RequireAuth allow={['PACIENTE', 'PROFESIONAL']}>
            <MyAppointmentsPage />
          </RequireAuth>
        }
      />
      {/* Videoconsulta de un turno (ENG-56). Los dos roles comparten la ruta: el
          backend decide quién entra y con qué permisos leyendo el turno, no la
          URL. Se llega desde "Mis turnos" dentro de la ventana de ingreso. */}
      <Route
        path="/turnos/:appointmentId/videoconsulta"
        element={
          <RequireAuth allow={['PACIENTE', 'PROFESIONAL']}>
            <VideoConsultationPage />
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
