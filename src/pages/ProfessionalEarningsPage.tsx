import { useState } from 'react';
import { formatDate, formatPrice } from '../features/appointments/lib/weeks';
import { cuando } from '../features/appointments/lib/timeline';
import { downloadEarningsCsv } from '../features/earnings/api/earningsApi';
import { useMyEarnings } from '../features/earnings/hooks/useEarnings';
import {
  currentMonth,
  earningChip,
  monthLabel,
  ORDER_OPTIONS,
  PERIOD_OPTIONS,
  periodRange,
  shiftMonth,
  STATE_OPTIONS,
  todayAR,
  type PeriodKind,
} from '../features/earnings/lib/earnings';
import type { EarningsFilters, EarningsView } from '../features/earnings/types';
import { Button } from '../shared/ui/Button';
import { DashboardLayout } from './DashboardLayout';

const TONOS = {
  ok: 'bg-surface-teal text-brand-hover',
  warn: 'bg-tag-warm text-tag-warm-ink',
  neutral: 'bg-line-soft text-muted',
} as const;

const SELECT =
  'rounded-full border border-line-strong bg-white px-3.5 py-2 text-sm font-semibold text-brand-deep focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand';

const FECHA =
  'rounded-full border border-line-strong bg-white px-3.5 py-1.5 text-sm font-semibold text-brand-deep focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand';

/**
 * Mis cobros (ENG-194): lo cobrado, lo reembolsado y el neto del período, y el
 * detalle por turno, con la descarga en CSV.
 *
 * El período se elige por mes, por los últimos 30 o 90 días, el año o un rango
 * a mano. Estado, paciente y orden filtran la tabla, y los totales y el CSV
 * siguen a lo que se ve: "cuánto le cobré a Fulano este año".
 *
 * Solo muestra: el cobro va directo a la cuenta de MercadoPago del profesional,
 * sin comisiones ni liquidaciones de MediConnect. El período es por fecha de
 * acreditación del pago.
 */
export function ProfessionalEarningsPage() {
  const [tipo, setTipo] = useState<PeriodKind>('MES');
  const [mes, setMes] = useState(() => currentMonth());
  const [rango, setRango] = useState({ desde: '', hasta: '' });
  const [filtros, setFiltros] = useState<EarningsFilters>({});
  const [pagina, setPagina] = useState(1);
  const [csv, setCsv] = useState<{ cargando: boolean; error: string | null }>({
    cargando: false,
    error: null,
  });
  const periodo = periodRange(tipo, { mes, ...rango });
  const valido = 'from' in periodo;
  const { from, to } = valido ? periodo : { from: '', to: '' };
  const cobros = useMyEarnings(from, to, pagina, filtros, valido);
  const esteMes = mes >= currentMonth();
  const hayFiltros = !!(filtros.estado || filtros.paciente);

  function cambiar(cambio: () => void) {
    cambio();
    setPagina(1);
  }

  async function descargar() {
    setCsv({ cargando: true, error: null });
    try {
      const blob = await downloadEarningsCsv(from, to, filtros);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cobros-${from}-a-${to}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setCsv({ cargando: false, error: null });
    } catch (err) {
      setCsv({ cargando: false, error: (err as Error).message });
    }
  }

  return (
    <DashboardLayout
      barTitle="Mis cobros"
      subtitle="Lo que cobraste por tus turnos y lo que se devolvió. El cobro va directo a tu cuenta de MercadoPago."
    >
      <div className="grid gap-5">
        <section
          aria-label="Período y filtros"
          className="grid gap-3 rounded-[14px] border border-line bg-white p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <label>
                <span className="sr-only">Período</span>
                <select
                  value={tipo}
                  onChange={(e) => cambiar(() => setTipo(e.target.value as PeriodKind))}
                  className={SELECT}
                >
                  {PERIOD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              {tipo === 'MES' && (
                <div
                  role="group"
                  aria-label="Mes"
                  className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-white p-0.5"
                >
                  <button
                    type="button"
                    onClick={() => cambiar(() => setMes((m) => shiftMonth(m, -1)))}
                    aria-label="Mes anterior"
                    className="rounded-full px-3 py-1 text-sm font-bold text-brand-deep hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    ‹
                  </button>
                  <span className="min-w-[140px] text-center text-sm font-semibold text-brand-deep">
                    {monthLabel(mes)}
                  </span>
                  <button
                    type="button"
                    onClick={() => cambiar(() => setMes((m) => shiftMonth(m, 1)))}
                    disabled={esteMes}
                    aria-label="Mes siguiente"
                    className="rounded-full px-3 py-1 text-sm font-bold text-brand-deep hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ›
                  </button>
                </div>
              )}

              {tipo === 'RANGO' && (
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                  <label className="flex items-center gap-2">
                    Desde
                    <input
                      type="date"
                      value={rango.desde}
                      max={rango.hasta || todayAR()}
                      onChange={(e) =>
                        cambiar(() => setRango((r) => ({ ...r, desde: e.target.value })))
                      }
                      className={FECHA}
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    Hasta
                    <input
                      type="date"
                      value={rango.hasta}
                      min={rango.desde || undefined}
                      max={todayAR()}
                      onChange={(e) =>
                        cambiar(() => setRango((r) => ({ ...r, hasta: e.target.value })))
                      }
                      className={FECHA}
                    />
                  </label>
                </div>
              )}
            </div>

            <Button
              variant="secondary"
              onClick={() => void descargar()}
              disabled={!valido || csv.cargando || !cobros.data || cobros.data.totals.turnos === 0}
            >
              {csv.cargando ? 'Generando…' : 'Descargar CSV'}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
            <label>
              <span className="sr-only">Estado</span>
              <select
                value={filtros.estado ?? ''}
                onChange={(e) =>
                  cambiar(() =>
                    setFiltros((f) => ({
                      ...f,
                      estado: (e.target.value || undefined) as EarningsFilters['estado'],
                    })),
                  )
                }
                className={SELECT}
              >
                <option value="">Todos los estados</option>
                {STATE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Paciente</span>
              <select
                value={filtros.paciente ?? ''}
                onChange={(e) =>
                  cambiar(() =>
                    setFiltros((f) => ({ ...f, paciente: e.target.value || undefined })),
                  )
                }
                className={SELECT}
              >
                <option value="">Todos los pacientes</option>
                {(cobros.data?.pacientes ?? []).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Orden</span>
              <select
                value={filtros.orden ?? 'RECIENTES'}
                onChange={(e) =>
                  cambiar(() =>
                    setFiltros((f) => ({
                      ...f,
                      orden: e.target.value as EarningsFilters['orden'],
                    })),
                  )
                }
                className={SELECT}
              >
                {ORDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {hayFiltros && (
              <button
                type="button"
                onClick={() => cambiar(() => setFiltros((f) => ({ orden: f.orden })))}
                className="text-sm font-bold text-brand-hover hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </section>

        {!valido ? (
          <p role="status" className="text-sm text-muted">
            {periodo.error}
          </p>
        ) : (
          <>
            {csv.error && (
              <p role="alert" className="text-sm text-danger">
                {csv.error}
              </p>
            )}
            {cobros.isPending ? (
              <Esqueleto />
            ) : cobros.isError && !cobros.data ? (
              <div role="alert" className="grid justify-items-start gap-3">
                <p className="text-sm text-danger">{cobros.error.message}</p>
                <Button variant="secondary" onClick={() => void cobros.refetch()}>
                  Reintentar
                </Button>
              </div>
            ) : (
              <Contenido
                datos={cobros.data}
                vacio={
                  hayFiltros
                    ? 'Ningún cobro coincide con los filtros'
                    : tipo === 'MES'
                      ? `No tuviste cobros en ${monthLabel(mes).toLowerCase()}`
                      : 'No tuviste cobros en este período'
                }
                pagina={pagina}
                onPagina={setPagina}
                actualizando={cobros.isFetching}
              />
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function Contenido({
  datos,
  vacio,
  pagina,
  onPagina,
  actualizando,
}: {
  datos: EarningsView;
  vacio: string;
  pagina: number;
  onPagina: (p: number) => void;
  actualizando: boolean;
}) {
  const precio = (n: number) => formatPrice(n, datos.currency);
  const { totals } = datos;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Total
          etiqueta="Cobrado"
          valor={precio(totals.cobrado)}
          detalle={`${totals.turnos} turnos`}
        />
        <Total
          etiqueta="Reembolsado"
          valor={precio(totals.reembolsado)}
          detalle={
            totals.pendiente > 0
              ? `${precio(totals.pendiente)} pendiente de devolver`
              : 'Devuelto a pacientes'
          }
        />
        <Total etiqueta="Neto" valor={precio(totals.neto)} detalle="Lo que te queda" destacado />
      </div>

      {totals.turnos === 0 ? (
        <section className="grid justify-items-center gap-1.5 rounded-[14px] border border-line bg-white px-6 py-10 text-center">
          <h2 className="text-[15px] font-semibold text-brand-deep">{vacio}</h2>
          <p className="max-w-[420px] text-[13px] leading-[1.6] text-muted">
            Cuando un paciente pague un turno, el cobro aparece acá con su fecha de acreditación.
          </p>
        </section>
      ) : (
        <section
          aria-labelledby="detalle-cobros"
          aria-busy={actualizando}
          className="overflow-hidden rounded-[14px] border border-line bg-white"
        >
          <h2 id="detalle-cobros" className="sr-only">
            Cobros por turno
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line-soft text-[11px] uppercase tracking-[0.1em] text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Cobro</th>
                  <th className="px-5 py-3 font-semibold">Turno</th>
                  <th className="px-5 py-3 font-semibold">Paciente</th>
                  <th className="px-5 py-3 text-right font-semibold">Monto</th>
                  <th className="px-5 py-3 text-right font-semibold">Reembolso</th>
                  <th className="px-5 py-3 text-right font-semibold">Neto</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft tabular-nums">
                {datos.rows.map((fila) => {
                  const chip = earningChip(fila);
                  return (
                    <tr key={fila.appointmentId}>
                      <td className="px-5 py-3 text-muted">{cuando(fila.paidAt)}</td>
                      <td className="px-5 py-3 text-ink">
                        {formatDate(fila.date)} · {fila.startTime}
                      </td>
                      <td className="px-5 py-3 font-semibold text-brand-deep">{fila.patient}</td>
                      <td className="px-5 py-3 text-right text-ink">{precio(fila.amount)}</td>
                      <td className="px-5 py-3 text-right text-muted">
                        {fila.refunded > 0 ? `− ${precio(fila.refunded)}` : '—'}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-brand-deep">
                        {precio(fila.net)}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${TONOS[chip.tone]}`}
                        >
                          {chip.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {(pagina > 1 || datos.hayMas) && (
            <div className="flex items-center justify-between border-t border-line-soft px-5 py-3 text-sm">
              <Button variant="ghost" onClick={() => onPagina(pagina - 1)} disabled={pagina === 1}>
                Anteriores
              </Button>
              <span className="text-muted">Página {pagina}</span>
              <Button variant="ghost" onClick={() => onPagina(pagina + 1)} disabled={!datos.hayMas}>
                Siguientes
              </Button>
            </div>
          )}
        </section>
      )}
    </>
  );
}

function Total({
  etiqueta,
  valor,
  detalle,
  destacado = false,
}: {
  etiqueta: string;
  valor: string;
  detalle: string;
  destacado?: boolean;
}) {
  return (
    <div
      className={`rounded-[14px] border p-5 ${
        destacado ? 'border-night bg-night text-white' : 'border-line bg-white'
      }`}
    >
      <p
        className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${
          destacado ? 'text-brand-bright' : 'text-muted'
        }`}
      >
        {etiqueta}
      </p>
      <p
        className={`font-display mt-2 text-[32px] leading-none tabular-nums ${
          destacado ? 'text-white' : 'text-brand-deep'
        }`}
      >
        {valor}
      </p>
      <p className={`mt-2 text-xs ${destacado ? 'text-on-night' : 'text-muted'}`}>{detalle}</p>
    </div>
  );
}

function Esqueleto() {
  return (
    <div role="status" aria-label="Cargando tus cobros" className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[112px] animate-pulse rounded-[14px] bg-line-soft" />
        ))}
      </div>
      <div className="h-[240px] animate-pulse rounded-[14px] bg-line-soft" />
    </div>
  );
}
