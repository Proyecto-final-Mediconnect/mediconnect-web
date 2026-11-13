import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog';
import { ClinicalEntryForm } from '../../clinical-records/components/ClinicalEntryForm';

const BOTON =
  'inline-flex items-center justify-center rounded-[10px] bg-brand-deep px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';

/**
 * Después de "Finalizar" (ENG-191): la evolución de la consulta, directo en la
 * historia clínica del paciente. Es el formulario de ENG-58 asociado a la
 * consulta, así que la entrada entra a la cadena de hash como cualquier otra.
 *
 * "Lo cargo después" vuelve a "Mis turnos" sin crear nada. Reemplaza al resumen
 * con IA, que no tiene backend.
 */
export function ConsultationEvolution({
  patientId,
  consultationId,
  counterpartName,
  onBack,
}: {
  patientId: string | null;
  consultationId: string;
  counterpartName: string;
  onBack: () => void;
}) {
  const navigate = useNavigate();
  const [guardada, setGuardada] = useState(false);
  // Lo escrito vive en el formulario: salir sin guardar lo pierde. Si hay algo
  // escrito, se confirma antes (review de #77).
  const [conCambios, setConCambios] = useState(false);
  const [salida, setSalida] = useState<(() => void) | null>(null);
  const salir = (accion: () => void) => {
    if (conCambios) setSalida(() => accion);
    else accion();
  };

  return (
    <section
      aria-labelledby="evolucion"
      className="mx-auto grid w-full max-w-[720px] gap-5 rounded-[16px] border border-line bg-white p-7"
    >
      <div className="grid gap-1.5">
        <h2 id="evolucion" className="font-display text-[26px] leading-[1.2] text-brand-deep">
          Evolución de la consulta
        </h2>
        <p className="text-sm text-muted">Consulta con {counterpartName}.</p>
      </div>

      {guardada ? (
        <div className="grid justify-items-start gap-4">
          <p role="status" className="text-sm font-semibold text-ink">
            Guardado en la historia clínica.
          </p>
          <Link to="/mis-turnos" className={BOTON}>
            Volver a mis turnos
          </Link>
        </div>
      ) : patientId ? (
        <ClinicalEntryForm
          patientId={patientId}
          consultationId={consultationId}
          cancelLabel="Lo cargo después"
          onSaved={() => setGuardada(true)}
          onCancel={() => salir(() => void navigate('/mis-turnos'))}
          onDirtyChange={setConCambios}
        />
      ) : (
        <div className="grid justify-items-start gap-3">
          <p role="alert" className="text-sm text-danger">
            No pudimos identificar al paciente de este turno. Cargá la evolución desde su historia
            clínica.
          </p>
          <Link to="/mis-turnos" className={BOTON}>
            Volver a mis turnos
          </Link>
        </div>
      )}

      {!guardada && (
        <button
          type="button"
          onClick={() => salir(onBack)}
          className="justify-self-start text-sm font-semibold text-brand-hover hover:underline"
        >
          Volver a la consulta
        </button>
      )}
      <ConfirmDialog
        open={salida !== null}
        titulo="¿Salir sin guardar la evolución?"
        confirmar="Salir sin guardar"
        cancelar="Seguir escribiendo"
        destructivo
        onCancel={() => setSalida(null)}
        onConfirm={() => {
          const accion = salida;
          setSalida(null);
          accion?.();
        }}
      >
        <p>Lo que escribiste no se guarda en la historia clínica.</p>
      </ConfirmDialog>
    </section>
  );
}
