import { anclaDe, formatEntryDate, readEntryFields, shortHash } from '../lib/clinicalEntry';
import { nombreDe } from '../lib/filtrarEntradas';
import { ENTRY_TYPE_LABELS, type ClinicalEntry } from '../types/clinicalRecord';

/**
 * Una entrada de la historia clínica, con la tarjeta del canvas.
 *
 * La forma sale de la pantalla "Historia clínica" del diseño: un riel con un
 * punto a la izquierda que hace legible la cadena como línea de tiempo, las
 * etiquetas arriba a la izquierda, la procedencia arriba a la derecha, el
 * titular en grande y los datos en grilla.
 *
 * **El titular es el primer campo del contenido, no un título aparte.** El
 * canvas muestra un título por registro ("Control de hipertensión"), pero las
 * entradas no tienen campo título: lo que hay es el contenido del recurso. El
 * primer campo de cada tipo es justamente el que resume la entrada —el motivo de
 * una consulta, el medicamento de una prescripción, el estudio de un informe—,
 * así que se usa como titular y el resto va a la grilla. Inventar un título
 * sería datos falsos; esto es jerarquía sobre datos reales.
 */

/** Color de la etiqueta según el tipo, como en el canvas: cada tipo de registro
 *  tiene el suyo para poder barrer la cadena de un vistazo. */
const COLOR_TIPO: Record<string, string> = {
  CORRECCION: 'bg-tag-correccion text-tag-correccion-ink',
  ESTUDIO: 'bg-tag-estudio text-tag-estudio-ink',
};
const COLOR_TIPO_POR_DEFECTO = 'bg-tag-consulta text-tag-consulta-ink';

const ETIQUETA = 'rounded-[5px] px-2.5 py-[5px] text-[10px] font-bold tracking-[0.08em]';

export function EntryCard({
  entry,
  corregidaPor,
  corrigeA,
}: {
  entry: ClinicalEntry;
  /** Nº de la entrada que corrige a esta, si existe. */
  corregidaPor?: number;
  /** Nº de la entrada que esta corrige, si está en la historia. */
  corrigeA?: number;
}) {
  const campos = readEntryFields(entry);
  const [titular, ...resto] = campos;
  const corregida = corregidaPor !== undefined;

  return (
    <article
      id={anclaDe(entry.sequenceNumber)}
      className="scroll-mt-6 rounded-[14px] border border-line bg-white p-6"
    >
      <div className="grid grid-cols-[11px_minmax(0,1fr)] gap-[18px]">
        {/* El punto del riel: teal cuando la entrada está firme, ámbar cuando
            una entrada posterior la corrige. Es el mismo código de color que
            usa el canvas para distinguir el estado de un registro. */}
        <span
          aria-hidden="true"
          className={`mt-1.5 h-[11px] w-[11px] rounded-full border-[3px] bg-white ${
            corregida ? 'border-tag-warm-dot' : 'border-brand-hover'
          }`}
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={`${ETIQUETA} ${COLOR_TIPO[entry.entryType] ?? COLOR_TIPO_POR_DEFECTO}`}
              >
                {(ENTRY_TYPE_LABELS[entry.entryType] ?? entry.entryType).toUpperCase()}
              </span>
              {corregida && (
                <span className={`${ETIQUETA} bg-tag-warm text-tag-warm-ink`}>CORREGIDA</span>
              )}
            </div>

            {/* Fecha y procedencia. El hash es el `REG-…` del canvas con el dato
                que existe de verdad: la posición en la cadena y su sello. */}
            <div className="grid gap-[3px] text-right">
              <span className="text-xs font-medium text-muted-soft">
                {formatEntryDate(entry.createdAt)}
              </span>
              <span
                className="font-mono text-[11px] text-muted-soft"
                title={entry.contentHash}
              >
                #{entry.sequenceNumber} · {shortHash(entry.contentHash)}
              </span>
            </div>
          </div>

          {titular ? (
            <h3 className="mt-3.5 text-[19px] font-bold leading-[1.35] text-brand-deep">
              {titular.value}
            </h3>
          ) : (
            <p className="mt-3.5 text-sm text-muted">
              Esta entrada no tiene contenido legible.
            </p>
          )}

          {/* Quién firmó el asiento: criterio de ENG-59 y de lo que la Ley
              26.529 exige que el registro identifique. */}
          {/* "Firmada por" y no el nombre suelto: en el canvas la línea lleva
              título, especialidad y matrícula, que no vienen en la entrada. Con
              solo el nombre, debajo de un titular clínico, se lee como si fuera
              el paciente. */}
          <p className="mt-1 text-[13px] font-medium text-muted">
            {entry.professional ? `Firmada por ${nombreDe(entry)}` : 'Profesional no disponible'}
          </p>

          {resto.length > 0 && (
            <dl className="mt-[18px] grid gap-x-[22px] gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {resto.map((campo) => (
                <div key={campo.label}>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-soft">
                    {campo.label}
                  </dt>
                  {/* `whitespace-pre-line`: el profesional escribe en varias
                      líneas y la historia tiene que conservar cómo lo escribió. */}
                  <dd className="mt-[7px] whitespace-pre-line text-sm font-medium leading-[1.55] text-ink">
                    {campo.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {(corrigeA !== undefined || entry.correctsEntryId || corregida) && (
            <p className="mt-4 border-t border-dashed border-line pt-3.5 text-[13px] leading-[1.6] text-muted">
              {entry.correctsEntryId &&
                (corrigeA === undefined ? (
                  // La corregida puede no estar en la lista: el paciente ve su
                  // cadena entera, pero un filtro activo puede dejarla afuera.
                  <>Corrige a una entrada anterior, que sigue en la historia sin modificar.</>
                ) : (
                  <>
                    Corrige a la{' '}
                    <a
                      href={`#${anclaDe(corrigeA)}`}
                      className="font-semibold text-brand-deep underline underline-offset-2"
                    >
                      entrada #{corrigeA}
                    </a>
                    , que sigue en la historia sin modificar.
                  </>
                ))}
              {corregida && (
                <>
                  Corregida más tarde por la{' '}
                  <a
                    href={`#${anclaDe(corregidaPor)}`}
                    className="font-semibold text-brand-deep underline underline-offset-2"
                  >
                    entrada #{corregidaPor}
                  </a>
                  . Esta queda como se escribió.
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
