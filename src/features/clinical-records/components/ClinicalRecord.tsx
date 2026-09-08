import { isClientError } from '../../../shared/api/apiError';
import { useClinicalRecord } from '../hooks/useClinicalRecord';
import { formatEntryDate, readEntryFields, shortHash } from '../lib/clinicalEntry';
import { ENTRY_TYPE_LABELS, type ClinicalEntry } from '../types/clinicalRecord';
import { ClinicalEntryForm } from './ClinicalEntryForm';

/**
 * Historia clínica de un paciente (ENG-58, ENG-59, ENG-60).
 *
 * Muestra el formulario y, debajo, las entradas que el backend deja ver. Qué
 * entradas son eso lo decide **RLS**, no esta pantalla, así que el componente no
 * ramifica por rol en ningún lado.
 *
 * Desde ENG-60 los dos roles ven la historia **completa**: el paciente la suya
 * (`..._select_own_patient`) y el profesional con un turno la de su paciente,
 * incluidas las entradas firmadas por otros profesionales. Antes de ENG-60 el
 * profesional veía solo lo que él había firmado, y varios textos de estas
 * pantallas seguían describiendo eso.
 *
 * El orden es del más reciente al más viejo, al revés de como viene del backend:
 * la cadena se construye hacia adelante, pero quien abre una HC busca lo último.
 */

type ClinicalRecordProps = {
  patientId: string;
  /** Consulta en curso, si se entra desde la videoconsulta. */
  consultationId?: string;
  /**
   * Qué decir cuando no hay nada que mostrar.
   *
   * Lo pone la página porque el vacío significa cosas distintas según quién
   * mire: para el paciente es "todavía no te registraron nada", para el
   * profesional es "este paciente no tiene historia".
   */
  emptyText?: string;
  /** Aclaración sobre el alcance de lo que se lista, si hace falta. */
  scopeNote?: string;
  /**
   * Si se muestra el formulario para agregar una entrada.
   *
   * El paciente lee su historia pero no escribe en ella (ENG-59): quien firma un
   * asiento clínico es el profesional. No es solo una decisión de UI — el
   * backend rechaza el POST de cualquiera que no tenga un turno con el paciente.
   */
  canAddEntries?: boolean;
};

export function ClinicalRecord({
  patientId,
  consultationId,
  emptyText = 'No hay entradas para mostrar.',
  scopeNote,
  canAddEntries = true,
}: ClinicalRecordProps) {
  const record = useClinicalRecord(patientId);
  const entries = record.data ?? [];

  // Las correcciones se muestran vinculadas en los dos sentidos: la corrección
  // dice a qué entrada corrige y la corregida avisa que hay una posterior. Sin
  // el segundo lado, quien lee la original de arriba abajo no se entera de que
  // fue corregida — que es justamente lo que la cadena tiene que hacer visible.
  const posicionDe = new Map(entries.map((e) => [e.id, e.sequenceNumber]));
  const corregidas = new Map(
    entries.filter((e) => e.correctsEntryId).map((e) => [e.correctsEntryId!, e.sequenceNumber]),
  );

  return (
    <div className="space-y-10">
      {canAddEntries && (
        <section aria-labelledby="nueva-entrada">
          <SectionHeading id="nueva-entrada" title="Agregar una entrada" />
          <div className="mt-4">
            <ClinicalEntryForm patientId={patientId} consultationId={consultationId} />
          </div>
        </section>
      )}

      <section aria-labelledby="entradas">
        <SectionHeading
          id="entradas"
          title="Historia clínica"
          count={record.data ? entries.length : undefined}
        />

        {scopeNote && <p className="mt-3 text-sm text-muted">{scopeNote}</p>}

        {record.isPending && (
          <p role="status" aria-live="polite" className="mt-4 text-sm text-muted">
            Cargando la historia clínica…
          </p>
        )}

        {record.isError && <RecordError error={record.error} />}

        {record.data && entries.length === 0 && (
          <p className="mt-4 rounded-[14px] border border-dashed border-line-strong bg-white p-6 text-[13px] leading-[1.6] text-muted">
            {emptyText}
          </p>
        )}

        {entries.length > 0 && (
          <ul className="mt-4 grid gap-3.5">
            {[...entries].reverse().map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                corregidas={corregidas}
                posicionDe={posicionDe}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/**
 * Encabezado de sección del canvas: el contador a la izquierda de un rótulo
 * chico en versalitas, sobre una línea. Es el mismo de "Mis turnos" — la HC
 * había quedado con `h2` sueltos de antes del rediseño.
 */
function SectionHeading({
  id,
  title,
  count,
}: {
  id: string;
  title: string;
  count?: number;
}) {
  return (
    <div className="flex items-baseline gap-4 border-t border-brand-deep pt-4">
      {count !== undefined && (
        <span className="text-xs font-semibold text-brand">
          {String(count).padStart(2, '0')}
        </span>
      )}
      <h2
        id={id}
        className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
      >
        {title}
      </h2>
    </div>
  );
}

/**
 * El 403 de ENG-60 no es un error a reintentar: es "no tenés turno con esta
 * persona". Mezclarlo con una caída del servidor deja al profesional apretando
 * recargar contra una puerta que no se va a abrir.
 */
function RecordError({ error }: { error: Error }) {
  const denied = (error as Partial<{ status: number }>).status === 403;

  return (
    <div
      role="alert"
      className={`mt-4 rounded-[14px] border p-6 ${
        denied ? 'border-line bg-surface' : 'border-danger/30 bg-danger/5'
      }`}
    >
      <p className={`text-sm ${denied ? 'text-ink' : 'text-danger'}`}>{error.message}</p>
      {denied && (
        <p className="mt-1.5 text-[13px] leading-[1.6] text-muted">
          El acceso se abre con un turno reservado, confirmado o ya completado con esa persona.
        </p>
      )}
      {!denied && !isClientError(error) && (
        <p className="mt-1.5 text-[13px] leading-[1.6] text-muted">
          Probá de nuevo en un momento. La historia clínica no se perdió: el problema es de
          lectura.
        </p>
      )}
    </div>
  );
}

function EntryCard({
  entry,
  corregidas,
  posicionDe,
}: {
  entry: ClinicalEntry;
  /** id de entrada corregida → nº de la corrección que la corrige. */
  corregidas: Map<string, number>;
  /** id de entrada → su nº en la cadena. */
  posicionDe: Map<string, number>;
}) {
  const campos = readEntryFields(entry);
  const corregidaPor = corregidas.get(entry.id);
  const corrigeA = entry.correctsEntryId ? posicionDe.get(entry.correctsEntryId) : undefined;

  return (
    <li id={anclaDe(entry.sequenceNumber)} className="scroll-mt-6 rounded-[14px] border border-line bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[17px] font-bold text-brand-deep">
            {formatEntryDate(entry.createdAt)}
          </p>
          {/* Quién firmó el asiento es parte del criterio de ENG-59, y de lo
              que la Ley 26.529 exige que el registro identifique. */}
          <p className="mt-1.5 text-sm text-muted">
            {entry.professional
              ? `Firmada por ${entry.professional.firstName} ${entry.professional.lastName}`
              : 'Profesional no disponible'}
          </p>
        </div>

        <span className="rounded-full bg-surface-teal px-3 py-1 text-xs font-semibold text-brand-hover">
          {ENTRY_TYPE_LABELS[entry.entryType] ?? entry.entryType}
        </span>
      </div>

      {campos.length > 0 && (
        <dl className="mt-4 grid gap-3">
          {campos.map((campo) => (
            <Section key={campo.label} label={campo.label} value={campo.value} />
          ))}
        </dl>
      )}

      {entry.correctsEntryId && (
        <p className="mt-4 rounded-[10px] border border-amber-300 bg-amber-50 px-4 py-3 text-[13px] leading-[1.7] text-amber-900">
          Corrige a la{' '}
          {corrigeA === undefined ? (
            // La corregida puede no estar en la lista: el paciente ve su cadena
            // entera, pero un profesional podría recibir un recorte.
            <span className="font-semibold">entrada anterior</span>
          ) : (
            <a href={`#${anclaDe(corrigeA)}`} className="font-semibold underline underline-offset-2">
              entrada #{corrigeA}
            </a>
          )}
          , que sigue en la historia sin modificar.
        </p>
      )}

      {corregidaPor !== undefined && (
        <p className="mt-4 rounded-[10px] border border-line-strong bg-surface px-4 py-3 text-[13px] leading-[1.7] text-muted">
          Corregida más tarde por la{' '}
          <a
            href={`#${anclaDe(corregidaPor)}`}
            className="font-semibold text-brand-deep underline underline-offset-2"
          >
            entrada #{corregidaPor}
          </a>
          . Esta queda como se escribió.
        </p>
      )}

      {/* El hash va al pie y no arriba: es procedencia, no encabezado. Se muestra
          a propósito —es la evidencia visible de que la entrada está sellada—
          pero no compite con la fecha ni con el motivo, que es lo que se lee. */}
      <p
        className="mt-5 border-t border-line-soft pt-3.5 font-mono text-[11px] text-muted-soft"
        title={entry.contentHash}
      >
        #{entry.sequenceNumber} · {shortHash(entry.contentHash)}
      </p>
    </li>
  );
}

/** Ancla estable para saltar de una corrección a la entrada que corrige. */
function anclaDe(sequenceNumber: number): string {
  return `entrada-${sequenceNumber}`;
}

/** Un campo del asiento. */
function Section({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-soft">
        {label}
      </dt>
      {/* `whitespace-pre-line`: el profesional escribe en varias líneas y la
          historia clínica tiene que conservar cómo lo escribió. */}
      <dd className="mt-1 whitespace-pre-line text-sm leading-[1.7] text-ink">{value}</dd>
    </div>
  );
}
