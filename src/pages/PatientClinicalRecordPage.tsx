import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ClinicalRecord } from '../features/clinical-records/components/ClinicalRecord';
import { DashboardLayout } from './DashboardLayout';

/**
 * Historia clínica de un paciente, desde el profesional (ENG-58).
 *
 * Se llega desde "Mis turnos", que es lo que satisface el "durante y después de
 * la consulta" del criterio: durante, el profesional la abre en otra pestaña
 * mientras está en la videoconsulta; después, entra por el mismo lugar.
 *
 * `?consultation=<uuid>` asocia la entrada a la consulta en curso. Es opcional
 * porque una entrada cargada al otro día no tiene una consulta de la que colgar.
 * Cuando ENG-56 esté mergeado, la pantalla de videoconsulta puede linkear acá con
 * ese parámetro ya puesto.
 */
export function PatientClinicalRecordPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const [searchParams] = useSearchParams();

  if (!patientId) return <Navigate to="/mis-turnos" replace />;

  return (
    <DashboardLayout
      title="Historia clínica"
      subtitle="Cada entrada queda sellada en la cadena de hash y no se puede modificar."
    >
      <ClinicalRecord
        patientId={patientId}
        consultationId={searchParams.get('consultation') ?? undefined}
      />
    </DashboardLayout>
  );
}
