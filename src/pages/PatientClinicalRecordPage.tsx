import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ClinicalRecord } from '../features/clinical-records/components/ClinicalRecord';
import { DashboardLayout } from './DashboardLayout';

/** Espeja el `@IsUUID('4')` del DTO del backend. */
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

  // Se descarta si no tiene forma de UUID en vez de mandarlo igual: el backend
  // lo valida con `@IsUUID('4')` y rechaza el request entero, con un mensaje que
  // no corresponde a ningún campo visible del formulario. Quien escribió una
  // evolución larga la perdería sin entender por qué, y sin poder arreglarlo
  // desde la pantalla. Asociar la entrada a una consulta es un extra: no vale
  // perder el asiento por un parámetro mal copiado.
  const consultationId = UUID_V4.test(searchParams.get('consultation') ?? '')
    ? (searchParams.get('consultation') ?? undefined)
    : undefined;

  return (
    <DashboardLayout
      barTitle="Historia clínica"
      subtitle="Cada entrada queda sellada en la cadena de hash y no se puede modificar."
    >
      <ClinicalRecord
        patientId={patientId}
        consultationId={consultationId}
        // Textos del alcance profesional: hoy RLS le muestra solo las entradas
        // que él firmó, así que un "no hay entradas" a secas sería falso —
        // puede haber una historia entera escrita por otros, invisible para él.
        emptyText="Todavía no escribiste ninguna entrada en esta historia clínica."
        scopeNote="Ves las entradas que vos firmaste."
      />
    </DashboardLayout>
  );
}
