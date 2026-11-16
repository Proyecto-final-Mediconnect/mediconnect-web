import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './features/auth/components/RequireAuth';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';

// Cada pantalla es un chunk aparte: la primera carga baja solo lo que se ve.
const VideoConsultationPreviewPage = lazy(() => import('./dev/VideoConsultationPreviewPage').then((m) => ({ default: m.VideoConsultationPreviewPage })));
const AppointmentConfirmedPage = lazy(() => import('./pages/AppointmentConfirmedPage').then((m) => ({ default: m.AppointmentConfirmedPage })));
const AppointmentDetailPage = lazy(() => import('./pages/AppointmentDetailPage').then((m) => ({ default: m.AppointmentDetailPage })));
const BookAppointmentPage = lazy(() => import('./pages/BookAppointmentPage').then((m) => ({ default: m.BookAppointmentPage })));
const CatalogPage = lazy(() => import('./pages/CatalogPage').then((m) => ({ default: m.CatalogPage })));
const EmergencyViewPage = lazy(() => import('./pages/EmergencyViewPage').then((m) => ({ default: m.EmergencyViewPage })));
const GuardiaFichaPage = lazy(() => import('./pages/GuardiaFichaPage').then((m) => ({ default: m.GuardiaFichaPage })));
const GuardiaJuegoPage = lazy(() => import('./pages/GuardiaJuegoPage').then((m) => ({ default: m.GuardiaJuegoPage })));
const MediPassPage = lazy(() => import('./pages/MediPassPage').then((m) => ({ default: m.MediPassPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));
const MessagesPage = lazy(() => import('./pages/MessagesPage').then((m) => ({ default: m.MessagesPage })));
const LegalPage = lazy(() => import('./pages/LegalPage').then((m) => ({ default: m.LegalPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const MyAppointmentsPage = lazy(() => import('./pages/MyAppointmentsPage').then((m) => ({ default: m.MyAppointmentsPage })));
const MyClinicalRecordPage = lazy(() => import('./pages/MyClinicalRecordPage').then((m) => ({ default: m.MyClinicalRecordPage })));
const PatientDashboardPage = lazy(() => import('./pages/PatientDashboardPage').then((m) => ({ default: m.PatientDashboardPage })));
const PaymentPage = lazy(() => import('./pages/PaymentPage').then((m) => ({ default: m.PaymentPage })));
const ProfessionalDashboardPage = lazy(() => import('./pages/ProfessionalDashboardPage').then((m) => ({ default: m.ProfessionalDashboardPage })));
const ProfessionalPublicProfilePage = lazy(() => import('./pages/ProfessionalPublicProfilePage').then((m) => ({ default: m.ProfessionalPublicProfilePage })));
const ProfessionalRegisterPage = lazy(() => import('./pages/ProfessionalRegisterPage').then((m) => ({ default: m.ProfessionalRegisterPage })));
const ProfessionalProfilePage = lazy(() => import('./pages/ProfessionalProfilePage').then((m) => ({ default: m.ProfessionalProfilePage })));
const ProfessionalEarningsPage = lazy(() => import('./pages/ProfessionalEarningsPage').then((m) => ({ default: m.ProfessionalEarningsPage })));
const ProfessionalPatientsPage = lazy(() => import('./pages/ProfessionalPatientsPage').then((m) => ({ default: m.ProfessionalPatientsPage })));
const ProfessionalReviewsPage = lazy(() => import('./pages/ProfessionalReviewsPage').then((m) => ({ default: m.ProfessionalReviewsPage })));
const ProfessionalSchedulePage = lazy(() => import('./pages/ProfessionalSchedulePage').then((m) => ({ default: m.ProfessionalSchedulePage })));
const PatientCatalogPage = lazy(() => import('./pages/PatientCatalogPage').then((m) => ({ default: m.PatientCatalogPage })));
const PatientClinicalRecordPage = lazy(() => import('./pages/PatientClinicalRecordPage').then((m) => ({ default: m.PatientClinicalRecordPage })));
const PatientProfessionalProfilePage = lazy(() => import('./pages/PatientProfessionalProfilePage').then((m) => ({ default: m.PatientProfessionalProfilePage })));
const PatientProfilePage = lazy(() => import('./pages/PatientProfilePage').then((m) => ({ default: m.PatientProfilePage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })));
const SpikeDailyPage = lazy(() => import('./pages/SpikeDailyPage').then((m) => ({ default: m.SpikeDailyPage })));
const VideoConsultationPage = lazy(() => import('./pages/VideoConsultationPage').then((m) => ({ default: m.VideoConsultationPage })));

function App() {
  return (
    <Suspense fallback={<div role="status" aria-live="polite" className="p-8 text-center">Cargando…</div>}>
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
      <Route path="/recuperar-contrasena" element={<ForgotPasswordPage />} />
      <Route path="/restablecer-contrasena" element={<ResetPasswordPage />} />
      <Route path="/registro/profesional" element={<ProfessionalRegisterPage />} />
      {/* Pública: se lee antes de crear la cuenta (ENG-140). */}
      <Route path="/legales" element={<LegalPage />} />

      {/* Privadas — un dashboard por rol (ENG-44) */}
      {/* Los dos perfiles quedaron sin guard desde antes de que existiera
          `RequireAuth`, y se defendían solos redirigiendo ante el 401. Andaba,
          pero dejaba cinco pantallas privadas con dos criterios distintos y nada
          que explicara por qué estas dos eran la excepción. */}
      <Route
        path="/perfil"
        element={
          <RequireAuth allow={['PROFESIONAL']}>
            <ProfessionalProfilePage />
          </RequireAuth>
        }
      />
      <Route
        path="/perfil/paciente"
        element={
          <RequireAuth allow={['PACIENTE']}>
            <PatientProfilePage />
          </RequireAuth>
        }
      />
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
      {/* Mis pacientes (ENG-197). */}
      <Route
        path="/profesional/pacientes"
        element={
          <RequireAuth allow={['PROFESIONAL']}>
            <ProfessionalPatientsPage />
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
          devuelve los turnos donde el usuario es paciente o profesional. */}
      <Route
        path="/mis-turnos"
        element={
          <RequireAuth allow={['PACIENTE', 'PROFESIONAL']}>
            <MyAppointmentsPage />
          </RequireAuth>
        }
      />
      {/* Mensajes (ENG-70). Los dos roles: el chat es entre paciente y
          profesional. Con `:conversationId` abre esa conversación; `nuevo/…` es
          el borrador de un chat que se crea con el primer mensaje. La ruta
          estática le gana a la dinámica, así "nuevo" no se lee como un id. */}
      <Route
        path="/mensajes/:conversationId?"
        element={
          <RequireAuth allow={['PACIENTE', 'PROFESIONAL']}>
            <MessagesPage />
          </RequireAuth>
        }
      />
      <Route
        path="/mensajes/nuevo/:contraparteId"
        element={
          <RequireAuth allow={['PACIENTE', 'PROFESIONAL']}>
            <MessagesPage />
          </RequireAuth>
        }
      />
      {/* El catálogo dentro de la app: mismo contenido que `/profesionales`,
          pero con la barra lateral. La pública sigue existiendo para quien llega
          sin cuenta, y no pide la sesión a propósito — por eso son dos rutas y no
          una que elija el marco. */}
      <Route
        path="/buscar"
        element={
          <RequireAuth allow={['PACIENTE', 'PROFESIONAL']}>
            <PatientCatalogPage />
          </RequireAuth>
        }
      />
      <Route
        path="/buscar/:professionalId"
        element={
          <RequireAuth allow={['PACIENTE', 'PROFESIONAL']}>
            <PatientProfessionalProfilePage />
          </RequireAuth>
        }
      />
      {/* Mi historia clínica (ENG-59). Solo PACIENTE: el profesional llega a la
          HC de un paciente por `/pacientes/:patientId/historia-clinica`, que es
          otra pantalla y otro alcance. Acá no hay parámetro — la única historia
          que un paciente puede ver es la suya, y el id sale de la sesión. */}
      <Route
        path="/mi-historia-clinica"
        element={
          <RequireAuth allow={['PACIENTE']}>
            <MyClinicalRecordPage />
          </RequireAuth>
        }
      />
      {/* MediPass (EP-05). Es del paciente. */}
      <Route
        path="/medipass"
        element={
          <RequireAuth allow={['PACIENTE']}>
            <MediPassPage />
          </RequireAuth>
        }
      />
      {/* Pública: la abre un médico de guardia que escaneó el QR con la cámara,
          sin cuenta (ENG-135, ENG-73). Entra con el código, no con sesión. */}
      <Route path="/medipass/emergencia" element={<EmergencyViewPage />} />

      {/* Derechos ARCO (ENG-86), para los tres roles y sin exigir la aceptación. */}
      <Route
        path="/privacidad"
        element={
          <RequireAuth skipLegal>
            <PrivacyPage />
          </RequireAuth>
        }
      />
      {/* Juego del stand para la jornada del 06/10: pacientes ficticios, sin
          backend. La notebook muestra la guardia y el celular abre la ficha. */}
      <Route path="/juego/guardia" element={<GuardiaJuegoPage />} />
      <Route path="/juego/guardia/ficha" element={<GuardiaFichaPage />} />
      {/* Pago del turno con MercadoPago (ENG-63) y confirmación (ENG-64). Solo
          PACIENTE: el que paga la consulta es quien la reservó. La ruta de pago es
          también la vuelta desde MercadoPago (`?resultado=…`). */}
      {/* Detalle de un turno (ENG-178): datos, qué pasó y acciones. */}
      <Route
        path="/turnos/:appointmentId"
        element={
          <RequireAuth allow={['PACIENTE', 'PROFESIONAL']}>
            <AppointmentDetailPage />
          </RequireAuth>
        }
      />
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
      {/* Historia clínica de un paciente, desde el profesional (ENG-58). Solo
          PROFESIONAL: la vista del paciente sobre su propia HC es ENG-59 y va
          por su propia ruta. Quién puede escribir en qué HC lo valida el
          backend, que exige un turno entre los dos. */}
      <Route
        path="/pacientes/:patientId/historia-clinica"
        element={
          <RequireAuth allow={['PROFESIONAL']}>
            <PatientClinicalRecordPage />
          </RequireAuth>
        }
      />
      <Route
        path="/profesional/resenas"
        element={
          <RequireAuth allow={['PROFESIONAL']}>
            <ProfessionalReviewsPage />
          </RequireAuth>
        }
      />
      {/* Mis cobros (ENG-194). */}
      <Route
        path="/profesional/cobros"
        element={
          <RequireAuth allow={['PROFESIONAL']}>
            <ProfessionalEarningsPage />
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
    </Suspense>
  );
}

export default App;
