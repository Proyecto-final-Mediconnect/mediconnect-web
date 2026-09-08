import { useSession } from '../features/auth/hooks/useSession';
import { ClinicalRecord } from '../features/clinical-records/components/ClinicalRecord';
import { DashboardLayout } from './DashboardLayout';

/**
 * Historia clínica propia, desde el paciente (ENG-59).
 *
 * Es la misma lista que ve el profesional, con dos diferencias que no son de
 * estilo:
 *
 * - **Sin formulario.** Quien firma un asiento clínico es el profesional. No es
 *   una decisión de UI: el backend rechaza el POST de cualquiera que no tenga un
 *   turno con el paciente, así que esconder el formulario solo evita ofrecer una
 *   acción que iba a fallar.
 * - **La historia es completa.** RLS le da al paciente todas sus entradas
 *   (`..._select_own_patient`), mientras que al profesional le muestra solo las
 *   que él firmó. Por eso los textos del vacío son distintos.
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
          canAddEntries={false}
          emptyText="Todavía no hay entradas en tu historia clínica. Aparecen acá cuando un profesional registra algo de una consulta."
        />
      )}
    </DashboardLayout>
  );
}
