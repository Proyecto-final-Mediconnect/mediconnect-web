import { useState } from 'react';
import { useSession } from '../features/auth/hooks/useSession';
import { ClinicalRecord } from '../features/clinical-records/components/ClinicalRecord';
import { MyDocuments } from '../features/patient-documents/components/MyDocuments';
import { UploadDocumentForm } from '../features/patient-documents/components/UploadDocumentForm';
import { useIsUploadingDocument } from '../features/patient-documents/hooks/usePatientDocuments';
import { Button } from '../shared/ui/Button';
import { Modal } from '../shared/ui/Modal';
import { RecordAccesses } from '../features/clinical-records/components/RecordAccesses';
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
 *
 * Lo único que el paciente sí agrega es documentación previa (ENG-164): el
 * botón "Subir documento" va en la barra, en el mismo lugar que "Agregar
 * entrada" en la pantalla del profesional, y abre un diálogo. Lo subido va en
 * su propia tarjeta, separado de lo firmado.
 */
export function MyClinicalRecordPage() {
  const { user, isLoading } = useSession();
  const [subiendo, setSubiendo] = useState(false);
  // Con la subida en vuelo, Esc, el fondo y la X no cierran: desmontar el
  // formulario escondería si falló, y el paciente lo volvería a subir.
  const subidaEnCurso = useIsUploadingDocument();

  return (
    <DashboardLayout
      barTitle="Mi historia clínica"
      subtitle="Todo lo que registraron los profesionales que te atendieron."
      action={
        user ? (
          <Button type="button" onClick={() => setSubiendo(true)}>
            Subir documento
          </Button>
        ) : undefined
      }
    >
      {isLoading && (
        <p role="status" aria-live="polite" className="text-muted">
          Cargando tu historia clínica…
        </p>
      )}

      {user && (
        <div className="mb-6">
          <MyDocuments onUpload={() => setSubiendo(true)} />
        </div>
      )}

      {/* `RequireAuth` ya garantiza la sesión; el guard es para no montar la
          lista con un id vacío mientras `GET /me` está en vuelo. */}
      {/* Quién la abrió (ENG-165): arriba y colapsado, para chequear de vez en
          cuando sin empujar la historia hacia abajo. */}
      {user && (
        <div className="mb-6">
          <RecordAccesses />
        </div>
      )}

      {user && (
        <ClinicalRecord
          patientId={user.id}
          scopeNote="En orden cronológico, de lo más reciente a lo más viejo. Los registros cerrados no se editan: si hubo una corrección, aparece como una entrada nueva vinculada al original."
          emptyText="Todavía no hay entradas en tu historia clínica. Aparecen acá cuando un profesional registra algo de una consulta."
        />
      )}

      <Modal
        open={subiendo}
        titulo="Subir un documento"
        descripcion="Un estudio, informe o receta que traés de otro lugar. Lo ven los profesionales que te atienden."
        onClose={() => setSubiendo(false)}
        pendiente={subidaEnCurso}
      >
        {subiendo && (
          <UploadDocumentForm
            onDone={() => setSubiendo(false)}
            onCancel={() => setSubiendo(false)}
          />
        )}
      </Modal>
    </DashboardLayout>
  );
}
