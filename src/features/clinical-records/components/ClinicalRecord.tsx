import { useEffect, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { isClientError } from '../../../shared/api/apiError';
import { useClinicalRecord } from '../hooks/useClinicalRecord';
import { DateBadge } from '../../appointments/components/agenda/DateBadge';
import { formatMonthYear } from '../../appointments/lib/agenda';
import { useMediaQuery, WIDE_QUERY } from '../../../shared/hooks/useMediaQuery';
import { SideDrawer } from '../../../shared/ui/SideDrawer';
import { readEntryFields } from '../lib/clinicalEntry';
import {
  agruparPorMes,
  diaLocal,
  FILTROS_VACIOS,
  nombreDe,
  filtrarEntradas,
  opcionesDe,
  type FiltrosHC,
} from '../lib/filtrarEntradas';
import type { ClinicalEntry } from '../types/clinicalRecord';
import { EntryCard } from './EntryCard';
import { TONO_TIPO } from '../lib/entryTone';
import { CorrectedChip, TypeChip } from './entryType';
import { RecordFilters } from './RecordFilters';

/**
 * Historia clínica de un paciente (ENG-58, ENG-59, ENG-60), con la
 * misma forma que "Mis turnos": los filtros al costado (arriba en pantallas
 * angostas), los registros en filas agrupadas por mes, y el detalle de cada uno
 * en el panel lateral (debajo de la fila en pantallas angostas).
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
  // En ancho se abre una sola, en el panel lateral; en angosto se despliegan
  // debajo de su fila y pueden quedar varias abiertas para comparar.
  const [abierta, setAbierta] = useState<number | null>(null);
  const [desplegadas, setDesplegadas] = useState<Set<number>>(() => new Set());
  const [imprimiendo, setImprimiendo] = useState(false);
  const wide = useMediaQuery(WIDE_QUERY);

  // La copia impresa lleva el detalle de cada registro, no las filas: también
  // cuando se imprime con Ctrl+P y no con el botón.
  useEffect(() => {
    const antes = () => flushSync(() => setImprimiendo(true));
    const despues = () => setImprimiendo(false);
    window.addEventListener('beforeprint', antes);
    window.addEventListener('afterprint', despues);
    return () => {
      window.removeEventListener('beforeprint', antes);
      window.removeEventListener('afterprint', despues);
    };
  }, []);

  const entries = useMemo(() => record.data ?? [], [record.data]);

  const { visibles, opciones, corregidaPor, posicionDe, porNumero } = useMemo(() => {
    // Los vínculos de corrección se calculan sobre la cadena completa y no
    // sobre lo filtrado: si no, filtrar por tipo escondería el otro lado del
    // vínculo y una entrada corregida aparecería como si estuviera firme.
    const corregidaPor = new Map<string, number>();
    const posicionDe = new Map<string, number>();
    const porNumero = new Map<number, ClinicalEntry>();
    for (const e of entries) {
      posicionDe.set(e.id, e.sequenceNumber);
      porNumero.set(e.sequenceNumber, e);
      if (e.correctsEntryId) corregidaPor.set(e.correctsEntryId, e.sequenceNumber);
    }

    return {
      visibles: filtrarEntradas(entries, filtros),
      opciones: opcionesDe(entries),
      corregidaPor,
      posicionDe,
      porNumero,
    };
  }, [entries, filtros]);

  const seleccionada = abierta !== null ? porNumero.get(abierta) : undefined;

  function descargar() {
    flushSync(() => setImprimiendo(true));
    window.print();
    setImprimiendo(false);
  }

  /** El detalle de una entrada, con los vínculos que abren a la otra punta. */
  function detalle(entry: ClinicalEntry, variant: 'card' | 'panel') {
    return (
      <EntryCard
        entry={entry}
        variant={variant}
        corregidaPor={corregidaPor.get(entry.id)}
        corrigeA={entry.correctsEntryId ? posicionDe.get(entry.correctsEntryId) : undefined}
        onIrA={
          variant !== 'panel'
            ? undefined
            : wide
              ? setAbierta
              : (seq) => {
                  setDesplegadas((actual) => new Set(actual).add(seq));
                  document
                    .getElementById(`fila-${seq}`)
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
        }
        onCorregir={
          puedeCorregir(entry)
            ? () => {
                setAbierta(null);
                onCorregir?.(entry);
              }
            : undefined
        }
      />
    );
  }

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
            <EncabezadoImpreso
              scopeNote={scopeNote}
              total={entries.length}
              visibles={visibles.length}
            />
            <div className="grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-8 print:block">
              <RecordFilters
                filtros={filtros}
                onChange={setFiltros}
                tipos={opciones.tipos}
                profesionales={opciones.profesionales}
                total={entries.length}
                visibles={visibles.length}
                onDescargar={descargar}
              />

              {visibles.length === 0 ? (
                <div className="rounded-[14px] border border-dashed border-line-strong bg-white p-6 text-[13px] leading-[1.6] text-muted">
                  Ninguna entrada coincide con esos filtros. Probá con otras palabras o ampliando
                  las fechas.{' '}
                  <button
                    type="button"
                    onClick={() => setFiltros(FILTROS_VACIOS)}
                    className="font-semibold text-brand-deep underline underline-offset-2"
                  >
                    Limpiar filtros
                  </button>
                </div>
              ) : imprimiendo ? (
                <div className="grid gap-4">
                  {[...visibles].reverse().map((entry) => (
                    <div key={entry.id}>{detalle(entry, 'card')}</div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-7">
                  {agruparPorMes([...visibles].reverse()).map(({ mes, entradas }) => (
                    <section key={mes} aria-labelledby={`mes-${mes}`} className="grid gap-3">
                      <h3
                        id={`mes-${mes}`}
                        className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
                      >
                        {formatMonthYear(mes)}
                      </h3>
                      {/* La línea de tiempo: un riel con un punto del color de
                          cada tipo (ámbar si el registro tiene una corrección),
                          y al lado la tarjeta compacta. */}
                      <ul className="relative grid gap-2.5 border-l-2 border-line-soft pl-6">
                        {entradas.map((entry) => (
                          <li
                            key={entry.id}
                            id={`fila-${entry.sequenceNumber}`}
                            className="relative"
                          >
                            <span
                              aria-hidden="true"
                              className={`absolute -left-[32px] top-[37px] size-3.5 -translate-y-1/2 rounded-full border-[3px] border-surface ring-2 ${
                                corregidaPor.has(entry.id)
                                  ? 'bg-tag-warm-dot ring-tag-warm-dot/30'
                                  : `${TONO_TIPO[entry.entryType]?.dot ?? 'bg-brand'} ring-line-soft`
                              }`}
                            />
                            <EntryRow
                              entry={entry}
                              corregida={corregidaPor.has(entry.id)}
                              abierta={
                                wide
                                  ? abierta === entry.sequenceNumber
                                  : desplegadas.has(entry.sequenceNumber)
                              }
                              wide={wide}
                              onToggle={() =>
                                wide
                                  ? setAbierta(entry.sequenceNumber)
                                  : setDesplegadas((actual) => {
                                      const siguiente = new Set(actual);
                                      if (!siguiente.delete(entry.sequenceNumber)) {
                                        siguiente.add(entry.sequenceNumber);
                                      }
                                      return siguiente;
                                    })
                              }
                            />
                            {/* En angosto el detalle se despliega debajo de la
                                fila; en ancho va al panel lateral. */}
                            {!wide && desplegadas.has(entry.sequenceNumber) && (
                              <div className="mt-2 rounded-[14px] bg-surface p-3">
                                {detalle(entry, 'panel')}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>

            <SideDrawer
              open={wide && seleccionada !== undefined}
              title="Registro de la historia clínica"
              onClose={() => setAbierta(null)}
            >
              {seleccionada && detalle(seleccionada, 'panel')}
            </SideDrawer>
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
          Probá de nuevo en un momento. La historia clínica no se perdió: el problema es de lectura.
        </p>
      )}
    </div>
  );
}

/**
 * Un registro en la línea de tiempo: tarjeta compacta con el día en un bloque,
 * el titular, quién lo firmó y el tipo al costado. El detalle se abre al tocarla.
 */
function EntryRow({
  entry,
  corregida,
  abierta,
  wide,
  onToggle,
}: {
  entry: ClinicalEntry;
  corregida: boolean;
  abierta: boolean;
  wide: boolean;
  onToggle: () => void;
}) {
  const titular = readEntryFields(entry)[0]?.value ?? 'Registro sin contenido legible';
  const hora = new Date(entry.createdAt).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={wide ? undefined : abierta}
      aria-haspopup={wide ? 'dialog' : undefined}
      className={`flex w-full items-center gap-3.5 rounded-[14px] border bg-white px-3.5 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        abierta ? 'border-brand ring-1 ring-brand' : 'border-line hover:border-line-strong'
      }`}
    >
      <DateBadge date={diaLocal(entry.createdAt)} muted={corregida} />
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-[15px] font-semibold ${corregida ? 'text-muted' : 'text-brand-deep'}`}
        >
          {titular}
        </span>
        {/* "Firmada por" y no el nombre suelto: debajo de un titular clínico,
            el nombre solo se lee como si fuera el paciente. */}
        <span className="block truncate text-sm text-muted-soft">
          {entry.professional ? `Firmada por ${nombreDe(entry)}` : 'Profesional no disponible'} ·{' '}
          {hora}
        </span>
      </span>
      <span className="hidden flex-none items-center gap-2 sm:flex">
        {corregida && <CorrectedChip />}
        <TypeChip type={entry.entryType} />
      </span>
      <span
        aria-hidden="true"
        className={`flex-none text-muted-soft transition-transform ${!wide && abierta ? 'rotate-90' : ''}`}
      >
        ›
      </span>
    </button>
  );
}

export type { ClinicalEntry };
