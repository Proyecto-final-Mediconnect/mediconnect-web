import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './features/auth/components/RequireAuth';
import { VideoConsultationPreviewPage } from './dev/VideoConsultationPreviewPage';
import { AppointmentConfirmedPage } from './pages/AppointmentConfirmedPage';
import { BookAppointmentPage } from './pages/BookAppointmentPage';
import { CatalogPage } from './pages/CatalogPage';
import { EmergencyViewPage } from './pages/EmergencyViewPage';
import { MediPassPage } from './pages/MediPassPage';
import { ClinicalRecordPage } from './pages/ClinicalRecordPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { ModeratorDashboardPage } from './pages/ModeratorDashboardPage';
import { MyAppointmentsPage } from './pages/MyAppointmentsPage';
import { PatientDashboardPage } from './pages/PatientDashboardPage';
import { PaymentPage } from './pages/PaymentPage';
import { ProfessionalDashboardPage } from './pages/ProfessionalDashboardPage';
import { ProfessionalPublicProfilePage } from './pages/ProfessionalPublicProfilePage';
import { ProfessionalRegisterPage } from './pages/ProfessionalRegisterPage';
import { ProfessionalProfilePage } from './pages/ProfessionalProfilePage';
import { ProfessionalSchedulePage } from './pages/ProfessionalSchedulePage';
import { PatientCatalogPage } from './pages/PatientCatalogPage';
import { PatientFilePage } from './pages/PatientFilePage';
import { PatientProfessionalProfilePage } from './pages/PatientProfessionalProfilePage';
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
      {/* Perfil público de un profesional (ENG-50): tampoco requiere sesión.
          Es el paso intermedio entre el catálogo y la reserva. Convive con
          `/profesionales/:professionalId/turnos` — React Router ordena por
          especificidad, no por declaración, así que la ruta de turnos gana
          sobre esta cuando el path tiene el segmento extra. */}
      <Route path="/profesionales/:professionalId" element={<ProfessionalPublicProfilePage />} />
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
      {/* El catálogo dentro de la app: mismo contenido que `/profesionales`,
          pero con la barra lateral. La pública sigue existiendo para quien llega
          sin cuenta, y no pide la sesión a propósito — por eso son dos rutas y no
          una que elija el marco. El MODERADOR también entra: le sirve para ver el
          perfil sobre el que está moderando una reseña. */}
      <Route
        path="/buscar"
        element={
          <RequireAuth allow={['PACIENTE', 'PROFESIONAL', 'MODERADOR']}>
            <PatientCatalogPage />
          </RequireAuth>
        }
      />
      <Route
        path="/buscar/:professionalId"
        element={
          <RequireAuth allow={['PACIENTE', 'PROFESIONAL', 'MODERADOR']}>
            <PatientProfessionalProfilePage />
          </RequireAuth>
        }
      />
      {/* Mi historia clínica (ENG-59). Solo PACIENTE: la vista del profesional
          sobre la HC de un paciente es la "ficha", que es otra pantalla. */}
      <Route
        path="/historia"
        element={
          <RequireAuth allow={['PACIENTE']}>
            <ClinicalRecordPage />
          </RequireAuth>
        }
      />
      {/* MediPass (EP-05, Release 3). Es del paciente: el acceso del consultante
          externo con código es otra historia (ENG-73) y entra sin sesión. */}
      <Route
        path="/medipass"
        element={
          <RequireAuth allow={['PACIENTE']}>
            <MediPassPage />
          </RequireAuth>
        }
      />
      <Route
        path="/medipass/emergencia"
        element={
          <RequireAuth allow={['PACIENTE']}>
            <EmergencyViewPage />
          </RequireAuth>
        }
      />
      {/* Ficha de un paciente (EP-06). Es la historia clínica vista por SU
          profesional, así que va solo para PROFESIONAL. Se entra desde el panel,
          y la pantalla exige tener un turno con ese paciente. */}
      <Route
        path="/pacientes/:patientId/ficha"
        element={
          <RequireAuth allow={['PROFESIONAL']}>
            <PatientFilePage />
          </RequireAuth>
        }
      />
      {/* Pago del turno (ENG-63) y confirmación (ENG-64). Solo PACIENTE: el que
          paga la consulta es quien la reservó. El cobro todavía está simulado —no
          existen los endpoints de MercadoPago— y las dos pantallas lo dicen. */}
      <Route
        path="/turnos/:appointmentId/pago"
        element={
          <RequireAuth allow={['PACIENTE']}>
            <PaymentPage />
          </RequireAuth>
        }
      />
      <Route
        path="/turnos/:appointmentId/confirmado"
        element={
          <RequireAuth allow={['PACIENTE']}>
            <AppointmentConfirmedPage />
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

      {/* Banco de pruebas de la videoconsulta. Solo en desarrollo: la pantalla
          real necesita DAILY_API_KEY en el backend y un turno dentro de la
          ventana de ingreso, así que sin esto no se puede ni mirar mientras se
          la construye. `import.meta.env.DEV` es false en el build, así que la
          ruta no existe en producción. */}
      {import.meta.env.DEV && (
        <Route path="/dev/videoconsulta" element={<VideoConsultationPreviewPage />} />
      )}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
