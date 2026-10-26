import { Navigate, useParams } from 'react-router-dom';
import { AppointmentDetail } from '../features/appointments/components/AppointmentDetail';
import { DashboardLayout } from './DashboardLayout';

/** El detalle de un turno (ENG-178). Paciente y profesional, como "Mis turnos". */
export function AppointmentDetailPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  if (!appointmentId) return <Navigate to="/mis-turnos" replace />;

  return (
    <DashboardLayout barTitle="Tu turno">
      <AppointmentDetail appointmentId={appointmentId} />
    </DashboardLayout>
  );
}
