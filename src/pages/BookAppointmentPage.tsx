import { Navigate, useParams, useSearchParams } from 'react-router-dom';
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
  // `?reprogramar=<id>`: la misma grilla, para mover un turno existente (ENG-66).
  const rescheduleId = useSearchParams()[0].get('reprogramar') ?? undefined;

  // La ruta no puede matchear sin el parámetro, pero TypeScript no lo sabe y un
  // id vacío armaría una URL de API rota.
  if (!professionalId) return <Navigate to="/paciente" replace />;

  return (
    <DashboardLayout
      barTitle={rescheduleId ? 'Reprogramar turno' : 'Elegí día y horario'}
      subtitle={
        rescheduleId
          ? 'Elegí el nuevo horario. Es el mismo turno: no se vuelve a cobrar.'
          : 'Elegí un horario disponible en la agenda del profesional.'
      }
    >
      <BookAppointment professionalId={professionalId} rescheduleId={rescheduleId} />
    </DashboardLayout>
  );
}
