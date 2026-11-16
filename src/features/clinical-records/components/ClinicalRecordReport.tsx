import { createPortal } from 'react-dom';
import { Logo } from '../../../shared/ui/Logo';
import { readEntryFields, shortHash } from '../lib/clinicalEntry';
import { nombreDe } from '../lib/filtrarEntradas';
import { ENTRY_TYPE_LABELS, type ClinicalEntry } from '../types/clinicalRecord';

const ZONA = 'America/Argentina/Buenos_Aires';
const DIA = new Intl.DateTimeFormat('es-AR', { day: 'numeric', timeZone: ZONA });
const MES_ANIO = new Intl.DateTimeFormat('es-AR', {
  month: 'short',
  year: 'numeric',
  timeZone: ZONA,
});
const HORA = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: ZONA,
});
const FECHA = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: ZONA,
});
const EMITIDA = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: ZONA,
});

/**
 * La historia clínica en PDF: un documento propio y no la pantalla impresa.
 *
 * Encabezado con el logo, el paciente y la fecha de emisión; un resumen (cuántos
 * registros, de qué tipo, con cuántos profesionales y entre qué fechas); la nota
 * de integridad; y cada registro con su fecha, quién lo firmó, sus campos, el
 * vínculo de corrección y el sello de la cadena.
 *
 * Es un portal en `body` con `.hoja-reporte`, así que al imprimir es lo único
 * que sale (ver `index.css`). Para que cada hoja tenga margen arriba y abajo con
 * la página en margen cero, el contenido va en una tabla: el navegador repite
 * `thead` y `tfoot` en cada hoja, y ahí van el encabezado y el pie corridos.
 */
export function ClinicalRecordReport({
  entries,
  total,
  corregidaPor,
  posicionDe,
  paciente,
  alcance,
}: {
  /** Lo que se imprime, en el orden de la pantalla. */
  entries: ClinicalEntry[];
  /** Cuántos registros tiene la historia completa, para avisar si hay filtros. */
  total: number;
  corregidaPor: Map<string, number>;
  posicionDe: Map<string, number>;
  paciente?: string;
  alcance?: string;
}) {
  const profesionales = new Set(entries.map((e) => e.professionalId)).size;
  const fechas = entries.map((e) => e.createdAt).sort();
  const porTipo = new Map<string, number>();
  for (const e of entries) porTipo.set(e.entryType, (porTipo.get(e.entryType) ?? 0) + 1);
  const resumenTipos = [...porTipo.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tipo, n]) => `${n} ${(ENTRY_TYPE_LABELS[tipo] ?? tipo).toLowerCase()}`)
    .join(' · ');
  const filtrada = entries.length !== total;
  const emitida = EMITIDA.format(new Date());

  return createPortal(
    <div className="hoja-reporte hoja-historia hidden bg-white text-ink print:block">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <td className="h-[13mm] align-bottom">
              <p className="flex justify-between border-b border-line pb-1.5 text-[8.5px] text-muted">
                <span>MediConnect · Historia clínica{paciente ? ` de ${paciente}` : ''}</span>
                <span>Emitida el {emitida}</span>
              </p>
            </td>
          </tr>
        </thead>
        <tfoot>
          <tr>
            <td className="h-[13mm] align-top">
              <p className="border-t border-line pt-1.5 text-[8.5px] leading-[1.5] text-muted">
                Documento generado desde MediConnect. Los registros clínicos no se pueden modificar
                ni borrar; cada uno está sellado y encadenado con el anterior.
              </p>
            </td>
          </tr>
        </tfoot>
        <tbody>
          <tr>
            <td className="align-top">
              <div className="flex items-end justify-between gap-6 border-b-2 border-brand-deep pb-4 pt-3">
                <div>
                  <Logo variant="lockup" className="h-7" alt="MediConnect" />
                  <h1 className="font-display mt-4 text-[30px] leading-[1.1] text-brand-deep">
                    Historia clínica
                  </h1>
                  {paciente && (
                    <p className="mt-1 text-[15px] font-semibold text-ink">{paciente}</p>
                  )}
                </div>
                <p className="text-right text-[11px] leading-[1.6] text-muted">
                  Emitida el {FECHA.format(new Date())}
                  <br />
                  {filtrada
                    ? `${entries.length} de ${total} registros (con filtros)`
                    : `${total} registros`}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-4 gap-3">
                <Dato etiqueta="Registros" valor={String(entries.length)} detalle={resumenTipos} />
                <Dato
                  etiqueta="Profesionales"
                  valor={String(profesionales)}
                  detalle={profesionales === 1 ? 'firmó los registros' : 'firmaron registros'}
                />
                <Dato
                  etiqueta="Primer registro"
                  valor={fechas[0] ? FECHA.format(new Date(fechas[0])) : '—'}
                  chico
                />
                <Dato
                  etiqueta="Último registro"
                  valor={fechas.at(-1) ? FECHA.format(new Date(fechas.at(-1)!)) : '—'}
                  chico
                />
              </div>

              <p className="mt-4 rounded-[8px] border border-line bg-surface px-3.5 py-2.5 text-[10.5px] leading-[1.6] text-ink">
                <b className="text-brand-deep">Registro inalterable.</b> Cada registro queda sellado
                con un hash SHA-256 de su contenido y del registro anterior, y se guarda en el
                estándar internacional FHIR. Nada se edita ni se borra: una corrección es un
                registro nuevo vinculado al original, y los dos figuran en este documento.
                {alcance ? ` ${alcance}` : ''}
              </p>

              <h2 className="mt-6 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-deep">
                Registros, del más reciente al más antiguo
              </h2>
              <div className="mt-1">
                {entries.map((e) => (
                  <Registro
                    key={e.id}
                    entry={e}
                    corregidaPor={corregidaPor.get(e.id)}
                    corrigeA={e.correctsEntryId ? posicionDe.get(e.correctsEntryId) : undefined}
                  />
                ))}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>,
    document.body,
  );
}

function Dato({
  etiqueta,
  valor,
  detalle,
  chico = false,
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  chico?: boolean;
}) {
  return (
    <div className="rounded-[10px] border border-line p-3.5">
      <p className="text-[8.5px] font-bold uppercase tracking-[0.14em] text-muted">{etiqueta}</p>
      <p
        className={`font-display mt-1.5 leading-[1.15] text-brand-deep ${
          chico ? 'text-[15px]' : 'text-[24px] tabular-nums'
        }`}
      >
        {valor}
      </p>
      {detalle && <p className="mt-1.5 text-[9.5px] leading-[1.45] text-muted">{detalle}</p>}
    </div>
  );
}

function Registro({
  entry,
  corregidaPor,
  corrigeA,
}: {
  entry: ClinicalEntry;
  corregidaPor?: number;
  corrigeA?: number;
}) {
  const fecha = new Date(entry.createdAt);
  const campos = readEntryFields(entry);
  const tipo = ENTRY_TYPE_LABELS[entry.entryType] ?? entry.entryType;
  const motivo = motivoDeCorreccion(entry.content);

  return (
    // `div` y no `article`: la regla de impresión de la pantalla le pone borde
    // completo a cada `article`.
    <div className="grid grid-cols-[24mm_minmax(0,1fr)] gap-4 border-t border-line py-4 [break-inside:avoid]">
      <div className="text-brand-deep">
        <p className="font-display text-[26px] leading-none">{DIA.format(fecha)}</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em]">
          {MES_ANIO.format(fecha).replace('.', '')}
        </p>
        <p className="mt-0.5 text-[10px] text-muted">{HORA.format(fecha)} h</p>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="rounded-full border border-brand-deep px-2 py-[1px] text-[9px] font-bold uppercase tracking-[0.1em] text-brand-deep">
            {tipo}
          </span>
          {corregidaPor !== undefined && (
            <span className="rounded-full border border-muted px-2 py-[1px] text-[9px] font-bold uppercase tracking-[0.1em] text-muted">
              Corregido
            </span>
          )}
          <span className="text-[10px] text-muted">Registro N.º {entry.sequenceNumber}</span>
        </div>
        <p className="mt-1.5 text-[11px] text-ink">
          Firmado por <b>{nombreDe(entry)}</b>
        </p>

        {campos.length > 0 && (
          <dl className="mt-2.5 grid gap-2">
            {campos.map((c) => (
              <div key={c.label}>
                <dt className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-muted">
                  {c.label}
                </dt>
                <dd className="mt-0.5 whitespace-pre-line text-[11px] leading-[1.55] text-ink">
                  {c.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {corrigeA !== undefined && (
          <p className="mt-2.5 text-[10px] text-brand-hover">
            Corrige el registro N.º {corrigeA}, que se conserva sin cambios en este documento.
            {motivo && <> Motivo: {motivo}</>}
          </p>
        )}
        {corregidaPor !== undefined && (
          <p className="mt-2.5 text-[10px] text-muted">
            Tiene una corrección posterior (registro N.º {corregidaPor}). Se conserva como se
            escribió.
          </p>
        )}

        <p className="mt-2.5 font-mono text-[8.5px] text-muted">
          Sello {shortHash(entry.contentHash)} · encadenado con {shortHash(entry.previousHash)}
        </p>
      </div>
    </div>
  );
}

/** La extensión FHIR con la que el backend guarda el motivo de una corrección (ENG-100). */
const EXTENSION_MOTIVO = 'urn:mediconnect:fhir:extension:correction-reason';

function motivoDeCorreccion(content: unknown): string | null {
  if (typeof content !== 'object' || content === null) return null;
  const extension = (content as { extension?: unknown }).extension;
  if (!Array.isArray(extension)) return null;
  const item = extension.find(
    (x): x is { url: string; valueString: string } =>
      typeof x === 'object' &&
      x !== null &&
      (x as { url?: unknown }).url === EXTENSION_MOTIVO &&
      typeof (x as { valueString?: unknown }).valueString === 'string',
  );
  return item?.valueString ?? null;
}
