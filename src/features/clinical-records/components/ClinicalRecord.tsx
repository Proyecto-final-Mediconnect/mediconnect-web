import { useClinicalRecord } from '../hooks/useClinicalRecord';
import { formatEntryDate, readEntry, shortHash } from '../lib/clinicalEntry';
import { ENTRY_TYPE_LABELS, type ClinicalEntry } from '../types/clinicalRecord';
import { ClinicalEntryForm } from './ClinicalEntryForm';

/**
 * Historia clínica de un paciente (ENG-58).
 *
 * Muestra el formulario y, debajo, las entradas que el backend deja ver. Qué
 * entradas son eso lo decide **RLS**, no esta pantalla: el paciente ve su
 * historia completa y el profesional las que firmó. Por eso el componente no
 * ramifica por rol en ningún lado.
 *
 * El orden es del más reciente al más viejo, al revés de como viene del backend:
 * la cadena se construye hacia adelante, pero quien abre una HC busca lo último.
 */

type ClinicalRecordProps = {
  patientId: string;
  /** Consulta en curso, si se entra desde la videoconsulta. */
  consultationId?: string;
};

export function ClinicalRecord({ patientId, consultationId }: ClinicalRecordProps) {
  const record = useClinicalRecord(patientId);

  return (
    <div className="space-y-10">
      <section aria-labelledby="nueva-entrada">
        <h2 id="nueva-entrada" className="text-lg font-semibold text-brand-deep">
          Agregar una entrada
        </h2>
        <div className="mt-4">
          <ClinicalEntryForm patientId={patientId} consultationId={consultationId} />
        </div>
      </section>

      <section aria-labelledby="entradas">
        <h2 id="entradas" className="text-lg font-semibold text-brand-deep">
          Historia clínica
          {record.data && (
            <span className="ml-2 text-sm font-normal text-muted">
              ({record.data.length})
            </span>
          )}
        </h2>

        {record.isPending && (
          <p role="status" aria-live="polite" className="mt-3 text-muted">
            Cargando la historia clínica…
          </p>
        )}

        {record.isError && (
          <p role="alert" className="mt-3 text-danger">
            {record.error.message}
          </p>
        )}

        {record.data?.length === 0 && (
          <p className="mt-3 text-sm text-muted">Todavía no hay entradas registradas.</p>
        )}

        {record.data && record.data.length > 0 && (
          <ul className="mt-4 space-y-4">
            {[...record.data].reverse().map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function EntryCard({ entry }: { entry: ClinicalEntry }) {
  const readable = readEntry(entry);

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="rounded-full bg-surface-teal px-3 py-1 text-xs font-medium text-brand-hover">
            {ENTRY_TYPE_LABELS[entry.entryType] ?? entry.entryType}
          </span>
          <p className="mt-2 text-sm text-muted">{formatEntryDate(entry.createdAt)}</p>
        </div>

        {/* El hash se muestra a propósito: es la evidencia visible de que la
            entrada está sellada. Nadie lo va a comparar a ojo, pero verlo
            comunica que el registro es inalterable. */}
        <p className="font-mono text-xs text-muted" title={entry.contentHash}>
          #{entry.sequenceNumber} · {shortHash(entry.contentHash)}
        </p>
      </div>

      <dl className="mt-4 space-y-3">
        <Section label="Motivo" value={readable.reason} />
        <Section label="Evolución" value={readable.findings} />
        <Section label="Diagnóstico" value={readable.diagnosis} />
        <Section label="Plan" value={readable.plan} />
      </dl>

      {entry.correctsEntryId && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Esta entrada corrige a una anterior, que sigue en la historia.
        </p>
      )}
    </li>
  );
}

/** Un campo del asiento. No se dibuja si no tiene contenido. */
function Section({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;

  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      {/* `whitespace-pre-line`: el profesional escribe en varias líneas y la
          historia clínica tiene que conservar cómo lo escribió. */}
      <dd className="mt-1 whitespace-pre-line text-sm text-ink">{value}</dd>
    </div>
  );
}
