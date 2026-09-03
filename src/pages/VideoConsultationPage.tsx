import { Navigate, useParams } from 'react-router-dom';
import { VideoConsultation } from '../features/video/components/VideoConsultation';
import { DashboardLayout } from './DashboardLayout';

/**
 * Videoconsulta de un turno (ENG-56).
 *
 * Una sola ruta para los dos roles: quién entra y con qué permisos lo decide el
 * backend leyendo el turno, no la URL. Se llega desde "Mis turnos", que muestra
 * el botón dentro de la ventana de ingreso.
 */
export function VideoConsultationPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();

  // La ruta declara el parámetro, así que en la práctica siempre viene. El
  // redirect es para que TypeScript no tenga que confiar en eso y para no montar
  // el componente con un id vacío si alguien edita la URL a mano.
  if (!appointmentId) return <Navigate to="/mis-turnos" replace />;

  return (
    // Sin subtítulo: la pantalla tiene dos fases y lo único que valía para las
    // dos era el título. El aviso de la sala vive en la fase en curso.
    <DashboardLayout barTitle="Videoconsulta">
      <VideoConsultation appointmentId={appointmentId} />
    </DashboardLayout>
  );
}
