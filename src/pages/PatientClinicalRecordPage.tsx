import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ClinicalRecord } from '../features/clinical-records/components/ClinicalRecord';
import { DashboardLayout } from './DashboardLayout';

/** Espeja el `@IsUUID('4')` del DTO del backend. */
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Historia clínica de un paciente, desde el profesional (ENG-58, ENG-60).
 *
 * Se llega desde "Mis turnos", que es lo que satisface el "durante y después de
 * la consulta" del criterio: durante, el profesional la abre en otra pestaña
 * mientras está en la videoconsulta; después, entra por el mismo lugar.
 *
 * **ENG-60 amplió lo que se ve acá.** Con ENG-58 el profesional leía solo las
 * entradas que él había firmado; hoy, teniendo un turno con el paciente, lee la
 * historia completa —también lo que escribieron otros profesionales—. Los textos
 * de esta pantalla decían lo primero mucho después de que dejara de ser cierto.
 *
 * `?consultation=<uuid>` asocia la entrada a la consulta en curso. Es opcional
 * porque una entrada cargada al otro día no tiene una consulta de la que colgar.
 *
 * Hoy **nadie pasa ese parámetro**: la videoconsulta (ENG-56) ya está mergeada,
 * pero `POST /appointments/:id/video` devuelve la contraparte sin `id` y no
 * devuelve el `consultationId`, así que la pantalla de la consulta no tiene con
 * qué armar el enlace. El parámetro se acepta igual —la ruta funciona si alguien
 * lo pone— y el link queda pendiente de esos dos campos en el backend.
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
        // Con ENG-60 el vacío pasó a ser literal: si no hay entradas, este
        // paciente no tiene historia clínica. Antes podía haber una historia
        // entera escrita por otros e invisible para quien miraba, y por eso el
        // texto no podía decir "no hay entradas" a secas.
        emptyText="Este paciente todavía no tiene entradas en su historia clínica. La primera la podés cargar con el formulario de arriba."
        scopeNote="Ves la historia completa, incluidas las entradas firmadas por otros profesionales. Los registros cerrados no se editan: si hubo una corrección, aparece como una entrada nueva vinculada al original."
      />
    </DashboardLayout>
  );
}
