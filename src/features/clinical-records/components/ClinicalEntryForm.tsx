import { useState, type FormEvent } from 'react';
import { Button } from '../../../shared/ui/Button';
import { useAddClinicalEntry } from '../hooks/useClinicalRecord';
import {
  ENTRY_TYPE_LABELS,
  SELECTABLE_ENTRY_TYPES,
  type NewClinicalEntryPayload,
  type SelectableEntryType,
} from '../types/clinicalRecord';

/**
 * Formulario para agregar una entrada a la HC (ENG-58).
 *
 * Es **estructurado y no un textarea libre** porque el contenido se guarda como
 * recurso FHIR R5: un párrafo suelto no se puede mapear a nada, cuatro campos con
 * significado propio sí. Los cuatro son los que pide el criterio de aceptación —
 * motivo, evolución, diagnóstico y plan— y solo el motivo es obligatorio, porque
 * los otros tres no aplican a todos los tipos de entrada.
 *
 * La fecha no está en el formulario: la pone el servidor al sellar. Entra a la
 * preimagen del hash, así que dejar elegirla permitiría antedatar un asiento
 * clínico con la cadena cerrando igual.
 */

type ClinicalEntryFormProps = {
  patientId: string;
  /** Consulta en curso, si se escribe durante la videoconsulta. */
  consultationId?: string;
};

const EMPTY = {
  entryType: 'CONSULTA' as SelectableEntryType,
  reason: '',
  findings: '',
  diagnosis: '',
  plan: '',
};

export function ClinicalEntryForm({ patientId, consultationId }: ClinicalEntryFormProps) {
  const [form, setForm] = useState(EMPTY);
  const [attempted, setAttempted] = useState(false);
  const add = useAddClinicalEntry(patientId);

  const reason = form.reason.trim();
  const reasonError = attempted && reason.length === 0 ? 'El motivo es obligatorio.' : undefined;

  function set<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);

    if (reason.length === 0) return;

    // Los opcionales vacíos no se mandan: el backend los omite del recurso FHIR,
    // y un campo vacío explícito sería ruido que el receptor tiene que interpretar.
    const payload: NewClinicalEntryPayload = {
      entryType: form.entryType,
      reason,
      ...(form.findings.trim() && { findings: form.findings.trim() }),
      ...(form.diagnosis.trim() && { diagnosis: form.diagnosis.trim() }),
      ...(form.plan.trim() && { plan: form.plan.trim() }),
      ...(consultationId && { consultationId }),
    };

    add.mutate(payload, { onSuccess: () => setForm(EMPTY) });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Lo que guardes acá <span className="font-semibold">no se puede editar ni borrar</span>.
        Si después hay que corregirlo, se agrega una entrada nueva que deja constancia de la
        corrección.
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="entryType" className="text-sm font-medium text-ink">
          Tipo de entrada
        </label>
        <select
          id="entryType"
          value={form.entryType}
          onChange={(event) => set('entryType', event.target.value as SelectableEntryType)}
          className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30"
        >
          {SELECTABLE_ENTRY_TYPES.map((type) => (
            <option key={type} value={type}>
              {ENTRY_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      <Field
        id="reason"
        label="Motivo de consulta"
        required
        rows={2}
        value={form.reason}
        error={reasonError}
        onChange={(value) => set('reason', value)}
      />
      <Field
        id="findings"
        label="Evolución y hallazgos"
        rows={4}
        value={form.findings}
        onChange={(value) => set('findings', value)}
      />
      <Field
        id="diagnosis"
        label="Diagnóstico"
        rows={2}
        value={form.diagnosis}
        onChange={(value) => set('diagnosis', value)}
      />
      <Field
        id="plan"
        label="Plan e indicaciones"
        rows={3}
        value={form.plan}
        onChange={(value) => set('plan', value)}
      />

      {add.isError && (
        <p
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {add.error.message}
        </p>
      )}

      {add.isSuccess && (
        <p
          role="status"
          className="rounded-lg border border-brand/30 bg-surface-teal px-4 py-3 text-sm text-brand-hover"
        >
          Entrada guardada en la historia clínica.
        </p>
      )}

      <Button type="submit" disabled={add.isPending}>
        {add.isPending ? 'Guardando…' : 'Guardar en la historia clínica'}
      </Button>
    </form>
  );
}

/** Campo de texto multilínea. Los cuatro del formulario son narrativos. */
function Field({
  id,
  label,
  value,
  rows,
  required,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  rows: number;
  required?: boolean;
  error?: string;
  onChange: (value: string) => void;
}) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {!required && <span className="ml-1 font-normal text-muted">(opcional)</span>}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        aria-invalid={!!error}
        aria-describedby={errorId}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-lg border px-3.5 py-2.5 text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-brand focus:ring-2 focus:ring-brand/30 ${
          error ? 'border-danger' : 'border-slate-300'
        }`}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
