import type { ReactNode } from 'react';
import { anclaDe, formatEntryDate, readEntryFields } from '../lib/clinicalEntry';
import { nombreDe } from '../lib/filtrarEntradas';
import type { ClinicalEntry } from '../types/clinicalRecord';
import { CorrectedChip, TypeChip } from './entryType';

/**
 * El detalle de una entrada de la historia clínica: lo que se abre al tocar una
 * fila (en el panel lateral en pantallas anchas, debajo de la fila en las
 * angostas) y lo que sale en la copia impresa.
 *
 * **El titular es el primer campo del contenido, no un título aparte.** Las
 * entradas no tienen campo título: lo que hay es el contenido del recurso, y el
 * primer campo de cada tipo es el que la resume —el motivo de una consulta, el
 * medicamento de una prescripción—. Inventar un título sería datos falsos.
 */
export function EntryCard({
  entry,
  corregidaPor,
  corrigeA,
  onCorregir,
  onIrA,
  variant = 'card',
}: {
  entry: ClinicalEntry;
  /** Nº de la entrada que corrige a esta, si existe. */
  corregidaPor?: number;
  /** Nº de la entrada que esta corrige, si está en la historia. */
  corrigeA?: number;
  /**
   * Abre la corrección de esta entrada (ENG-100). Viene solo cuando el que mira
   * la firmó y todavía no tiene corrección: lo decide `ClinicalRecord`, que ve
   * la cadena completa. Sin esto no se dibuja el botón.
   */
  onCorregir?: () => void;
  /**
   * Abre otra entrada de la cadena (la original o su corrección). Sin esto, el
   * vínculo es un ancla a la tarjeta, que es lo que sirve en la copia impresa.
   */
  onIrA?: (sequenceNumber: number) => void;
  /** `panel` va adentro del panel lateral, sin borde propio. */
  variant?: 'card' | 'panel';
}) {
  const campos = readEntryFields(entry);
  const [titular, ...resto] = campos;
  const corregida = corregidaPor !== undefined;

  return (
    <article
      id={variant === 'card' ? anclaDe(entry.sequenceNumber) : undefined}
      className={
        variant === 'card'
          ? 'scroll-mt-6 rounded-[14px] border border-line bg-white p-5 print:break-inside-avoid sm:p-6'
          : 'grid gap-4'
      }
    >
      <div className={variant === 'panel' ? 'rounded-[14px] bg-white p-5' : ''}>
        <div className="flex flex-wrap items-center gap-2">
          <TypeChip type={entry.entryType} />
          {corregida && <CorrectedChip />}
        </div>

        {titular ? (
          <h3 className="mt-3 text-[20px] font-bold leading-[1.3] text-balance text-brand-deep">
            {titular.value}
          </h3>
        ) : (
          <p className="mt-3 text-sm text-muted">Esta entrada no tiene contenido legible.</p>
        )}

        {/* Quién firmó y cuándo: criterio de ENG-59 y lo que la Ley 26.529 exige
            que el registro identifique. "Firmada por" y no el nombre suelto:
            debajo de un titular clínico, se leería como si fuera el paciente. */}
        <div className="mt-3 flex items-center gap-2.5">
          {entry.professional && (
            <span
              aria-hidden="true"
              className="flex size-8 flex-none items-center justify-center rounded-full bg-surface-teal text-[11px] font-bold text-brand-deep"
            >
              {entry.professional.firstName[0]}
              {entry.professional.lastName[0]}
            </span>
          )}
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-brand-deep">
              {entry.professional ? `Firmada por ${nombreDe(entry)}` : 'Profesional no disponible'}
            </span>
            <time dateTime={entry.createdAt} className="block text-[13px] text-muted">
              {formatEntryDate(entry.createdAt)}
            </time>
          </span>
        </div>
      </div>

      {resto.length > 0 && (
        <dl
          className={
            variant === 'panel'
              ? 'grid gap-4 rounded-[14px] bg-white p-5'
              : 'mt-5 grid gap-x-6 gap-y-4 border-t border-line-soft pt-5 sm:grid-cols-2'
          }
        >
          {resto.map((campo) => (
            <div key={campo.label}>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                {campo.label}
              </dt>
              {/* `whitespace-pre-line`: el profesional escribe en varias líneas
                  y la historia tiene que conservar cómo lo escribió. */}
              <dd className="mt-1.5 whitespace-pre-line text-[15px] leading-[1.6] text-ink">
                {campo.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* Las dos caras del vínculo de corrección. La original se conserva sin
          cambios: el registro clínico no se edita, se corrige con otro. */}
      {entry.correctsEntryId && (
        <Aviso variant={variant}>
          Corrige un registro anterior, que se conserva sin cambios.{' '}
          {/* La corregida puede no estar: un filtro puesto la deja afuera. */}
          {corrigeA !== undefined && (
            <Vinculo seq={corrigeA} onIrA={onIrA}>
              Ver el registro original
            </Vinculo>
          )}
        </Aviso>
      )}

      {corregida && (
        <Aviso variant={variant}>
          Este registro tiene una corrección posterior. Se conserva como se escribió.{' '}
          <Vinculo seq={corregidaPor} onIrA={onIrA}>
            Ver la corrección
          </Vinculo>
        </Aviso>
      )}

      {variant === 'panel' && (
        <p className="px-1 text-xs leading-[1.6] text-muted-soft">
          Registro sellado: una vez guardado no se puede modificar ni borrar.
        </p>
      )}

      {/* Va al pie: corregir es lo último que se decide, después de leer. */}
      {onCorregir && (
        <div className={variant === 'panel' ? '' : 'mt-4 flex justify-end'}>
          <button
            type="button"
            onClick={onCorregir}
            className={
              variant === 'panel'
                ? 'w-full rounded-full border border-line-strong bg-white px-4 py-2.5 text-sm font-semibold text-brand-deep transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand'
                : 'rounded-[7px] px-2 py-1 text-[13px] font-semibold text-brand-deep underline underline-offset-2 outline-none transition-colors hover:text-brand-hover focus-visible:ring-2 focus-visible:ring-brand/40'
            }
          >
            Corregir esta entrada
          </button>
        </div>
      )}
    </article>
  );
}

function Aviso({ variant, children }: { variant: 'card' | 'panel'; children: ReactNode }) {
  return (
    <p
      className={`rounded-[10px] px-4 py-3 text-[13px] leading-[1.6] text-muted ${
        variant === 'panel' ? 'bg-tag-warm/60' : 'mt-4 bg-surface'
      }`}
    >
      {children}
    </p>
  );
}

function Vinculo({
  seq,
  onIrA,
  children,
}: {
  seq: number;
  onIrA?: (sequenceNumber: number) => void;
  children: ReactNode;
}) {
  const clase = 'font-semibold text-brand-deep underline underline-offset-2';
  return onIrA ? (
    <button type="button" onClick={() => onIrA(seq)} className={clase}>
      {children}
    </button>
  ) : (
    <a href={`#${anclaDe(seq)}`} className={clase}>
      {children}
    </a>
  );
}
