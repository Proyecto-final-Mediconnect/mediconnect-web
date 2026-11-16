import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Logo } from './Logo';

/**
 * Piezas de la hoja de los reportes en PDF. El hook y las fechas viven en
 * `shared/lib/printReport.ts`.
 */

const GENERADO = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'America/Argentina/Buenos_Aires',
});

/**
 * La hoja A4 del reporte: encabezado con el logo, título, a quién corresponde y
 * qué período cubre; el contenido; y un pie con cuándo se generó.
 */
export function ReportSheet({
  titulo,
  persona,
  periodo,
  rango,
  pie,
  children,
}: {
  titulo: string;
  /** Nombre de quien descarga; si no se conoce todavía, no se muestra. */
  persona?: string;
  /** "Últimos 3 meses". */
  periodo: string;
  /** "Del 1 de septiembre al 30 de noviembre de 2026". */
  rango: string;
  /** Aclaraciones sobre cómo leer los números. */
  pie?: ReactNode;
  children: ReactNode;
}) {
  return createPortal(
    <div className="hoja-reporte hidden bg-white text-ink print:block">
      {/* `div` y no `header`: la regla de impresión de la historia clínica oculta
          todos los `header` (la barra superior de la app). */}
      <div className="flex items-end justify-between gap-6 border-b-2 border-brand-deep pb-4">
        <div>
          <Logo variant="lockup" className="h-7" alt="MediConnect" />
          <h1 className="font-display mt-4 text-[30px] leading-[1.1] text-brand-deep">{titulo}</h1>
          {persona && <p className="mt-1 text-[14px] font-semibold text-ink">{persona}</p>}
        </div>
        <div className="text-right text-[11px] leading-[1.6] text-muted">
          <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-brand-hover">
            {periodo}
          </p>
          <p>{rango}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-5">{children}</div>

      <footer className="mt-8 grid gap-1.5 border-t border-line pt-3 text-[10px] leading-[1.6] text-muted">
        {pie}
        <p>
          Generado el {GENERADO.format(new Date())} (hora de Argentina) · MediConnect · Los datos
          corresponden al momento de la descarga.
        </p>
      </footer>
    </div>,
    document.body,
  );
}

/** Un indicador grande de la hoja. */
export function ReportKpi({
  etiqueta,
  valor,
  detalle,
  apagado = false,
}: {
  etiqueta: string;
  valor: string;
  detalle?: ReactNode;
  apagado?: boolean;
}) {
  return (
    <div className="rounded-[10px] border border-line p-4">
      <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted">{etiqueta}</p>
      <p
        className={`font-display mt-2 text-[28px] leading-none tabular-nums ${
          apagado ? 'text-muted' : 'text-brand-deep'
        }`}
      >
        {valor}
      </p>
      {detalle && <p className="mt-2 text-[10px] leading-[1.5] text-muted">{detalle}</p>}
    </div>
  );
}

/** Un bloque con título dentro de la hoja. */
export function ReportBlock({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-deep">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

/** Tabla de dos columnas (concepto · valor) para el detalle. */
export function ReportTable({
  filas,
}: {
  filas: { concepto: string; valor: string; destacado?: boolean }[];
}) {
  return (
    <table className="w-full border-collapse text-[11.5px]">
      <tbody>
        {filas.map((f) => (
          <tr
            key={f.concepto}
            className={f.destacado ? 'border-t-2 border-brand-deep' : 'border-t border-line'}
          >
            <td className={`py-2 ${f.destacado ? 'font-bold text-brand-deep' : 'text-ink'}`}>
              {f.concepto}
            </td>
            <td
              className={`py-2 text-right tabular-nums ${
                f.destacado ? 'font-bold text-brand-deep' : 'font-semibold text-ink'
              }`}
            >
              {f.valor}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** El botón de los paneles. Discreto: la acción principal del panel es otra. */
export function ExportPdfButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-white px-3 py-1 text-xs font-semibold text-brand-deep transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
        <path
          d="M8 2v8m0 0L5 7m3 3 3-3M3 12.5h10"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Exportar PDF
    </button>
  );
}
