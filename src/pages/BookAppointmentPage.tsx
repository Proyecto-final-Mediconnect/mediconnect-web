import { Navigate, useParams } from 'react-router-dom';
import { BookAppointment } from '../features/appointments/components/BookAppointment';
import { DashboardLayout } from './DashboardLayout';

/**
 * Reserva de turno con un profesional (ENG-54).
 *
 * Se llega desde el catálogo público (ENG-49) o desde el perfil del profesional
 * (ENG-50); los dos están en revisión en sus propias ramas, así que hasta que
 * mergeen se entra por URL directa
 * (`/profesionales/<id-del-profesional>/turnos`). Esta pantalla no duplica el
 * buscador de profesionales: es trabajo de ENG-49.
 */
export function BookAppointmentPage() {
  const { professionalId } = useParams<{ professionalId: string }>();

  // La ruta no puede matchear sin el parámetro, pero TypeScript no lo sabe y un
  // id vacío armaría una URL de API rota.
  if (!professionalId) return <Navigate to="/paciente" replace />;

  return (
    <DashboardLayout
      barTitle="Elegí día y horario"
      greeting="Reservar un turno"
      subtitle="Elegí un horario disponible en la agenda del profesional."
    >
      <BookAppointment professionalId={professionalId} />
    </DashboardLayout>
  );
}
