import { useState, type FormEvent } from 'react';
import { Button } from '../../../shared/ui/Button';
import { useCorrectClinicalEntry } from '../hooks/useClinicalRecord';
import { readEntry } from '../lib/clinicalEntry';
import type { ClinicalEntry, CorrectionPayload } from '../types/clinicalRecord';
import { EntryField } from './EntryField';

/**
 * Corregir una entrada de la HC (ENG-100).
 *
 * ## Arranca con el contenido de la entrada original cargado
 *
 * Es lo que hace que corregir un campo sea corregir un campo, y no volver a
 * escribir el asiento entero de memoria. El profesional ve lo que había, cambia
 * lo que estaba mal y deja el resto igual — que es exactamente lo que se guarda,
 * porque la corrección lleva el asiento completo.
 *
 * Los campos se leen del recurso FHIR con `readEntry`. Si la entrada vino con
 * otra forma —hay recursos viejos en la base que no son `ClinicalImpression`—
 * los campos que no se reconocen arrancan vacíos en vez de bloquear la
 * corrección: el original queda igual de todos modos, y una entrada que no se
 * puede corregir es peor que una que hay que reescribir.
 *
 * ## El motivo de la corrección es obligatorio
 *
 * Sin él la historia queda con dos asientos casi idénticos y nadie puede saber
 * cuál era el error. Va como campo propio y no mezclado con el contenido clínico,
 * y el backend lo guarda dentro del recurso, así que entra al hash: no se puede
 * reescribir después.
 *
 * La entrada original **no se toca**. No hay nada en este formulario que la
 * modifique, y no lo hay tampoco en el backend ni en la base.
 */

type CorrectEntryFormProps = {
  patientId: string;
  /** La entrada que se está corrigiendo. */
  entry: ClinicalEntry;
  /** Se llama cuando la corrección quedó guardada. Lo usa el diálogo para cerrarse. */
  onSaved?: () => void;
  onCancel?: () => void;
};

export function CorrectEntryForm({
  patientId,
  entry,
  onSaved,
  onCancel,
}: CorrectEntryFormProps) {
  const original = readEntry(entry);
  const [form, setForm] = useState({
    reason: original.reason ?? '',
    findings: original.findings ?? '',
    diagnosis: original.diagnosis ?? '',
    plan: original.plan ?? '',
    correctionReason: '',
  });
  const [attempted, setAttempted] = useState(false);
  const correct = useCorrectClinicalEntry(patientId);

  const reason = form.reason.trim();
  const correctionReason = form.correctionReason.trim();

  const reasonError =
    attempted && reason.length === 0 ? 'El motivo es obligatorio.' : undefined;
  const correctionReasonError =
    attempted && correctionReason.length === 0
      ? 'Hay que indicar qué se está corrigiendo y por qué.'
      : undefined;

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);

    if (reason.length === 0 || correctionReason.length === 0) return;

    // Los opcionales vacíos no se mandan, igual que en el alta: el backend los
    // omite del recurso FHIR y un campo vacío explícito sería ruido.
    const payload: CorrectionPayload = {
      reason,
      correctionReason,
      ...(form.findings.trim() && { findings: form.findings.trim() }),
      ...(form.diagnosis.trim() && { diagnosis: form.diagnosis.trim() }),
      ...(form.plan.trim() && { plan: form.plan.trim() }),
    };

    correct.mutate(
      { entryId: entry.id, payload },
      {
        onSuccess: () => {
          // El aviso de éxito lo da la corrección apareciendo en la cadena, con
          // la original marcada como CORREGIDA. Un cartel dentro de un diálogo
          // que se cierra no lo lee nadie.
          onSaved?.();
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-4">
      <div className="rounded-[10px] border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] leading-[1.7] text-amber-900">
        La entrada original <span className="font-semibold">se conserva sin cambios</span>. Esto
        agrega un registro nuevo que queda vinculado a ella, y que tampoco se va a poder editar.
      </div>

      <EntryField
        id="correctionReason"
        label="Qué estás corrigiendo"
        required
        rows={2}
        hint="Queda visible en la historia clínica: es lo que explica por qué hay dos registros."
        value={form.correctionReason}
        error={correctionReasonError}
        onChange={(value) => set('correctionReason', value)}
      />

      <hr className="border-line" />

      <p className="text-[13px] leading-[1.6] text-muted">
        Abajo está el contenido de la entrada original. Corregí lo que esté mal y dejá el resto
        como está: lo que quede acá es lo que se guarda como versión corregida.
      </p>

      <EntryField
        id="reason"
        label="Motivo de consulta"
        required
        rows={2}
        value={form.reason}
        error={reasonError}
        onChange={(value) => set('reason', value)}
      />
      <EntryField
        id="findings"
        label="Evolución y hallazgos"
        rows={4}
        value={form.findings}
        onChange={(value) => set('findings', value)}
      />
      <EntryField
        id="diagnosis"
        label="Diagnóstico"
        rows={2}
        value={form.diagnosis}
        onChange={(value) => set('diagnosis', value)}
      />
      <EntryField
        id="plan"
        label="Plan e indicaciones"
        rows={3}
        value={form.plan}
        onChange={(value) => set('plan', value)}
      />

      {correct.isError && <CorrectionError error={correct.error} />}

      <div className="mt-1 flex flex-wrap justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={correct.isPending}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={correct.isPending}>
          {correct.isPending ? 'Guardando…' : 'Guardar la corrección'}
        </Button>
      </div>
    </form>
  );
}

/**
 * Los dos errores propios de este endpoint dicen qué hacer; el resto, no.
 *
 * El **409** es el caso que más importa: significa que esa entrada ya tiene una
 * corrección, y el mensaje solo del backend deja al profesional sin saber que lo
 * que tiene que corregir es la corrección, no el asiento original.
 */
function CorrectionError({ error }: { error: Error }) {
  const status = (error as Partial<{ status: number }>).status;

  return (
    <div
      role="alert"
      className="rounded-[10px] border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
    >
      <p>{error.message}</p>
      {status === 409 && (
        <p className="mt-1.5 text-[13px] leading-[1.6] text-muted">
          Cerrá esto y corregí la corrección más reciente de ese registro, así queda claro cuál es
          el dato vigente.
        </p>
      )}
      {status === 403 && (
        <p className="mt-1.5 text-[13px] leading-[1.6] text-muted">
          Solo corrige la entrada quien la firmó. Si el dato está mal y no es tuyo, agregá una
          entrada nueva.
        </p>
      )}
    </div>
  );
}
