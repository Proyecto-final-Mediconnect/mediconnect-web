import { useSession } from '../features/auth/hooks/useSession';
import { ClinicalRecord } from '../features/clinical-records/components/ClinicalRecord';
import { DashboardLayout } from './DashboardLayout';

/**
 * Historia clínica propia, desde el paciente (ENG-59).
 *
 * Es la misma lista que ve el profesional, con dos diferencias que no son de
 * estilo:
 *
 * - **Sin alta.** Quien firma un asiento clínico es el profesional, así que esta
 *   pantalla no ofrece "Agregar entrada". No es una decisión de UI: el backend
 *   rechaza el POST de cualquiera que no tenga un turno con el paciente, así que
 *   esconderlo solo evita ofrecer una acción que iba a fallar. Por eso el alta
 *   vive en `PatientClinicalRecordPage` y no en `ClinicalRecord`: es de la
 *   pantalla del profesional, no de la historia.
 * - **El vacío significa otra cosa.** Para el paciente es "todavía no te
 *   registraron nada"; para el profesional, que desde ENG-60 también ve la
 *   historia completa, es "este paciente no tiene historia". Por eso el texto lo
 *   pone cada página y no el componente.
 *
 * El id sale de la sesión y no de la URL: la HC que un paciente puede ver es la
 * suya, y no hay nada que elegir.
 */
export function MyClinicalRecordPage() {
  const { user, isLoading } = useSession();

  return (
    <DashboardLayout
      barTitle="Mi historia clínica"
      subtitle="Todo lo que registraron los profesionales que te atendieron."
    >
      {isLoading && (
        <p role="status" aria-live="polite" className="text-muted">
          Cargando tu historia clínica…
        </p>
      )}

      {/* `RequireAuth` ya garantiza la sesión; el guard es para no montar la
          lista con un id vacío mientras `GET /me` está en vuelo. */}
      {user && (
        <ClinicalRecord
          patientId={user.id}
          scopeNote="En orden cronológico, de lo más reciente a lo más viejo. Los registros cerrados no se editan: si hubo una corrección, aparece como una entrada nueva vinculada al original."
          emptyText="Todavía no hay entradas en tu historia clínica. Aparecen acá cuando un profesional registra algo de una consulta."
        />
      )}
    </DashboardLayout>
  );
}
