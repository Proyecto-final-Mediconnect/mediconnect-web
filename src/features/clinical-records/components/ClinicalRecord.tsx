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
  /**
   * Qué decir cuando no hay nada que mostrar.
   *
   * Lo pone la página porque el vacío significa cosas distintas según quién
   * mire: para el paciente es "todavía no te registraron nada", para el
   * profesional es "este paciente no tiene historia".
   */
  emptyText?: string;
  /**
   * Aclaración sobre el alcance de lo que se lista.
   *
   * No se dibuja en pantalla —la barra del panel ya da el contexto— pero
   * encabeza la copia impresa, que sale sin ninguna de las dos cosas.
   */
  scopeNote?: string;
  /**
   * Quién está mirando, para saber qué entradas firmó (ENG-100).
   *
   * Solo lo pasa la pantalla del profesional. Sin esto no se dibuja ningún botón
   * de corregir, que es lo correcto en la pantalla del paciente: quien firma —y
   * quien corrige— un asiento clínico es el profesional.
   */
  viewerId?: string;
  /**
   * Abre la corrección de una entrada (ENG-100).
   *
   * El diálogo vive en la pantalla y no acá por el mismo motivo que el alta: es
   * de la pantalla, no de la historia. Este componente solo decide **sobre qué
   * entradas se ofrece**, porque es el que tiene la cadena completa para saber
   * cuáles ya están corregidas.
   */
  onCorregir?: (entry: ClinicalEntry) => void;
};

export function ClinicalRecord({
  patientId,
  emptyText = 'No hay entradas para mostrar.',
  scopeNote,
  viewerId,
  onCorregir,
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

  /**
   * Las tres condiciones para ofrecer la corrección de una entrada (ENG-100).
   *
   * Espejan lo que el backend exige, y están acá para no ofrecer un botón que va
   * a terminar en un 403 o un 409. **El backend sigue siendo la autoridad**: esto
   * es lo que evita el error, no lo que lo previene.
   *
   * La comparación de UUID es sin distinguir mayúsculas porque es la misma
   * comparación que el backend hace con `sameUuid`, y en JS son strings.
   */
  function puedeCorregir(entry: ClinicalEntry): boolean {
    if (!onCorregir || !viewerId) return false;
    // Solo el que firmó. La pantalla del profesional lista también las entradas
    // de otros profesionales del mismo paciente (ENG-60).
    if (entry.professionalId.toLowerCase() !== viewerId.toLowerCase()) return false;
    // Una entrada ya corregida no se vuelve a corregir: hay que corregir la
    // corrección, así el historial queda lineal y se sabe cuál es el dato
    // vigente. Se mira sobre la cadena completa, no sobre lo filtrado.
    return !corregidaPor.has(entry.id);
  }

  return (
    <div className="grid gap-8">
      <section aria-labelledby="entradas">
        {/* El título de la sección no se dibuja: la barra del panel ya dice en
            qué pantalla estás y repetirlo empujaba la cadena media pantalla
            abajo. Sigue existiendo para el lector de pantalla, que no tiene esa
            barra a mano cuando entra a la región. */}
        <h2 id="entradas" className="sr-only">
          Historia clínica
        </h2>

        {record.isPending && (
          <p role="status" aria-live="polite" className="text-sm text-muted">
            Cargando la historia clínica…
          </p>
        )}

        {record.isError && <RecordError error={record.error} />}

        {record.data && entries.length === 0 && (
          <p className="rounded-[14px] border border-dashed border-line-strong bg-white p-6 text-[13px] leading-[1.6] text-muted">
            {emptyText}
          </p>
        )}

        {entries.length > 0 && (
          <>
            <EncabezadoImpreso scopeNote={scopeNote} total={entries.length} visibles={visibles.length} />
          <div className="grid items-start gap-[22px] lg:grid-cols-[262px_minmax(0,1fr)] print:block">
            <RecordFilters
              filtros={filtros}
              onChange={setFiltros}
              tipos={opciones.tipos}
              profesionales={opciones.profesionales}
              total={entries.length}
              visibles={visibles.length}
              onDescargar={() => window.print()}
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
                    onCorregir={
                      puedeCorregir(entry) ? () => onCorregir?.(entry) : undefined
                    }
                  />
                ))}
              </div>
            )}
          </div>
          </>
        )}
      </section>

    </div>
  );
}

/**
 * Lo que encabeza la copia impresa y no se ve en pantalla.
 *
 * Una historia clínica impresa circula sola: puede terminar en la carpeta de
 * otro profesional, y ahí no hay barra de panel ni pantalla que la explique.
 * Necesita decir qué es, cuándo se sacó y —si había filtros puestos— que no es
 * la historia completa. Sin esa última línea, una impresión filtrada se lee
 * como si fuera todo lo que hay.
 */
function EncabezadoImpreso({
  scopeNote,
  total,
  visibles,
}: {
  scopeNote?: string;
  total: number;
  visibles: number;
}) {
  return (
    <div className="hidden print:mb-6 print:block">
      <h1 className="text-[22px] font-bold text-brand-deep">Historia clínica</h1>
      {scopeNote && <p className="mt-1.5 text-[12px] leading-[1.6] text-muted">{scopeNote}</p>}
      <p className="mt-1.5 text-[12px] text-muted">
        Impresa el {new Date().toLocaleDateString('es-AR')} ·{' '}
        {visibles === total
          ? `${total} entradas`
          : `${visibles} de ${total} entradas (hay filtros aplicados)`}
      </p>
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
