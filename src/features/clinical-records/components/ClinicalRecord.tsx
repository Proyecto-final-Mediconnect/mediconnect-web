import { useMemo, useState } from 'react';
import { isClientError } from '../../../shared/api/apiError';
import { useClinicalRecord } from '../hooks/useClinicalRecord';
import {
  FILTROS_VACIOS,
  filtrarEntradas,
  opcionesDe,
  type FiltrosHC,
} from '../lib/filtrarEntradas';
import type { ClinicalEntry } from '../types/clinicalRecord';
import { ClinicalEntryForm } from './ClinicalEntryForm';
import { EntryCard } from './EntryCard';
import { RecordFilters } from './RecordFilters';

/**
 * Historia clínica de un paciente (ENG-58, ENG-59, ENG-60), con la pantalla del
 * canvas: filtros al costado y la cadena como línea de tiempo.
 *
 * Qué entradas se ven lo decide **RLS**, no esta pantalla, así que el componente
 * no ramifica por rol. Desde ENG-60 los dos roles ven la historia **completa**:
 * el paciente la suya y el profesional con turno la de su paciente, incluidas
 * las entradas firmadas por otros profesionales.
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
  const [filtros, setFiltros] = useState<FiltrosHC>(FILTROS_VACIOS);

  const entries = useMemo(() => record.data ?? [], [record.data]);

  const { visibles, opciones, corregidaPor, posicionDe } = useMemo(() => {
    // Los vínculos de corrección se calculan sobre la cadena completa y no
    // sobre lo filtrado: si no, filtrar por tipo escondería el otro lado del
    // vínculo y una entrada corregida aparecería como si estuviera firme.
    const corregidaPor = new Map<string, number>();
    const posicionDe = new Map<string, number>();
    for (const e of entries) {
      posicionDe.set(e.id, e.sequenceNumber);
      if (e.correctsEntryId) corregidaPor.set(e.correctsEntryId, e.sequenceNumber);
    }

    return {
      visibles: filtrarEntradas(entries, filtros),
      opciones: opcionesDe(entries),
      corregidaPor,
      posicionDe,
    };
  }, [entries, filtros]);

  return (
    <div className="grid gap-8">
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

        {scopeNote && (
          <p className="mt-3 max-w-[720px] text-[15px] leading-[1.7] text-muted">{scopeNote}</p>
        )}

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
          <div className="mt-6 grid items-start gap-[22px] lg:grid-cols-[262px_minmax(0,1fr)]">
            <RecordFilters
              filtros={filtros}
              onChange={setFiltros}
              tipos={opciones.tipos}
              profesionales={opciones.profesionales}
              total={entries.length}
              visibles={visibles.length}
            />

            {visibles.length === 0 ? (
              <p className="rounded-[14px] border border-dashed border-line-strong bg-white p-6 text-[13px] leading-[1.6] text-muted">
                Ninguna entrada coincide con esos filtros. Probá ampliando el rango de fechas o
                sacando alguno.
              </p>
            ) : (
              <div className="grid gap-3.5">
                {[...visibles].reverse().map((entry) => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    corregidaPor={corregidaPor.get(entry.id)}
                    corrigeA={
                      entry.correctsEntryId ? posicionDe.get(entry.correctsEntryId) : undefined
                    }
                  />
                ))}
              </div>
            )}
          </div>
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
function SectionHeading({ id, title, count }: { id: string; title: string; count?: number }) {
  return (
    <div className="flex items-baseline gap-4 border-t border-brand-deep pt-4">
      {count !== undefined && (
        <span className="text-xs font-semibold text-brand">
          {String(count).padStart(2, '0')}
        </span>
      )}
      <h2 id={id} className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
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

export type { ClinicalEntry };
