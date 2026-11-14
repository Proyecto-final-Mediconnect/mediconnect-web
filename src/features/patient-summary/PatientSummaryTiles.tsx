import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPrice } from '../appointments/lib/weeks';
import { getMySummary } from './api';
import { PERIOD_LABELS, periodRange, type SummaryPeriod } from './period';

/**
 * El resumen del inicio del paciente (ENG-198): consultas, lo que pagó, lo que
 * le devolvieron y quién accedió a su información, del período elegido. Cada
 * número lleva a su detalle: Mis turnos o el historial de accesos.
 */
export function PatientSummaryTiles() {
  const [periodo, setPeriodo] = useState<SummaryPeriod>('30D');
  const { from, to } = periodRange(periodo);
  const resumen = useQuery({
    queryKey: ['patient-summary', from, to] as const,
    queryFn: () => getMySummary(from, to),
    staleTime: 60_000,
  });
  const datos = resumen.data;
  const sinActividad =
    datos &&
    datos.consultas.realizadas === 0 &&
    datos.pagos.pagado === 0 &&
    datos.accesos.total === 0;

  return (
    <section aria-labelledby="tu-resumen" className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="tu-resumen"
          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
        >
          Tu resumen
        </h2>
        <div role="group" aria-label="Período" className="inline-flex gap-1">
          {(Object.keys(PERIOD_LABELS) as SummaryPeriod[]).map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={periodo === p}
              onClick={() => setPeriodo(p)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                periodo === p
                  ? 'bg-brand-deep text-white'
                  : 'border border-line bg-white text-muted hover:border-brand'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {resumen.isPending ? (
        <div
          role="status"
          aria-label="Cargando tu resumen"
          className="grid grid-cols-2 overflow-hidden rounded-[14px] border border-line bg-white lg:grid-cols-4"
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="m-4 h-[58px] animate-pulse rounded-[8px] bg-line-soft" />
          ))}
        </div>
      ) : resumen.isError && !datos ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-line bg-white p-4"
        >
          <p className="text-sm text-danger">{resumen.error.message}</p>
          <button
            type="button"
            onClick={() => void resumen.refetch()}
            className="text-sm font-semibold text-brand-hover hover:underline"
          >
            Reintentar
          </button>
        </div>
      ) : datos && sinActividad ? (
        <p className="rounded-[14px] border border-line bg-white p-4 text-sm text-muted">
          Sin actividad en {PERIOD_LABELS[periodo].toLowerCase()}: no tuviste consultas, pagos ni
          accesos a tu información.
        </p>
      ) : datos ? (
        <div className="grid grid-cols-2 divide-line overflow-hidden rounded-[14px] border border-line bg-white lg:grid-cols-4 lg:divide-x">
          <Tile
            to="/mis-turnos"
            valor={String(datos.consultas.realizadas)}
            etiqueta="Consultas realizadas"
            detalle={
              datos.consultas.profesionales === 1
                ? 'Con 1 profesional'
                : `Con ${datos.consultas.profesionales} profesionales`
            }
          />
          <Tile
            to="/mis-turnos"
            valor={formatPrice(datos.pagos.pagado, datos.currency)}
            etiqueta="Pagaste"
            detalle={`Neto ${formatPrice(datos.pagos.neto, datos.currency)}`}
          />
          <Tile
            to="/mis-turnos"
            valor={formatPrice(datos.pagos.reembolsado, datos.currency)}
            etiqueta="Te reembolsaron"
            detalle="Por turnos cancelados"
          />
          <Tile
            to={datos.accesos.historiaClinica > 0 ? '/mi-historia-clinica#accesos' : '/medipass'}
            valor={String(datos.accesos.total)}
            etiqueta="Accesos a tu información"
            detalle={`${datos.accesos.medipass} al MediPass · ${datos.accesos.historiaClinica} a tu historia`}
          />
        </div>
      ) : null}
    </section>
  );
}

/** Un número del resumen: dígitos en Newsreader, como el resto de las cifras grandes. */
function Tile({
  to,
  valor,
  etiqueta,
  detalle,
}: {
  to: string;
  valor: string;
  etiqueta: string;
  detalle: string;
}) {
  return (
    <Link
      to={to}
      className="block p-4 transition-colors hover:bg-surface focus:outline-none focus-visible:bg-surface"
    >
      <span className="font-display block text-[28px] leading-none tabular-nums text-brand-deep">
        {valor}
      </span>
      <span className="mt-2 block text-xs font-semibold text-ink">{etiqueta}</span>
      <span className="mt-0.5 block text-xs text-muted">{detalle}</span>
    </Link>
  );
}
