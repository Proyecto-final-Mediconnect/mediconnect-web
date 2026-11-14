import { useState } from 'react';
import { formatDate, formatPrice } from '../features/appointments/lib/weeks';
import { cuando } from '../features/appointments/lib/timeline';
import { downloadEarningsCsv } from '../features/earnings/api/earningsApi';
import { useMyEarnings } from '../features/earnings/hooks/useEarnings';
import {
  currentMonth,
  earningChip,
  monthLabel,
  monthRange,
  shiftMonth,
} from '../features/earnings/lib/earnings';
import type { EarningsView } from '../features/earnings/types';
import { Button } from '../shared/ui/Button';
import { DashboardLayout } from './DashboardLayout';

const TONOS = {
  ok: 'bg-surface-teal text-brand-hover',
  warn: 'bg-tag-warm text-tag-warm-ink',
  neutral: 'bg-line-soft text-muted',
} as const;

/**
 * Mis cobros (ENG-194): lo cobrado, lo reembolsado y el neto del mes, y el
 * detalle por turno, con la descarga en CSV.
 *
 * Solo muestra: el cobro va directo a la cuenta de MercadoPago del profesional,
 * sin comisiones ni liquidaciones de MediConnect. El período es por fecha de
 * acreditación del pago.
 */
export function ProfessionalEarningsPage() {
  const [mes, setMes] = useState(() => currentMonth());
  const [pagina, setPagina] = useState(1);
  const [csv, setCsv] = useState<{ cargando: boolean; error: string | null }>({
    cargando: false,
    error: null,
  });
  const { from, to } = monthRange(mes);
  const cobros = useMyEarnings(from, to, pagina);
  const esteMes = mes >= currentMonth();

  function irA(delta: number) {
    setMes((m) => shiftMonth(m, delta));
    setPagina(1);
  }

  async function descargar() {
    setCsv({ cargando: true, error: null });
    try {
      const blob = await downloadEarningsCsv(from, to);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cobros-${mes}.csv`;
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="group"
            aria-label="Mes"
            className="inline-flex items-center gap-1 rounded-[10px] border border-line bg-white p-1"
          >
            <button
              type="button"
              onClick={() => irA(-1)}
              aria-label="Mes anterior"
              className="rounded-[7px] px-3 py-1.5 text-sm font-bold text-brand-deep hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              ‹
            </button>
            <span className="min-w-[150px] text-center text-sm font-semibold capitalize text-brand-deep">
              {monthLabel(mes)}
            </span>
            <button
              type="button"
              onClick={() => irA(1)}
              disabled={esteMes}
              aria-label="Mes siguiente"
              className="rounded-[7px] px-3 py-1.5 text-sm font-bold text-brand-deep hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-40"
            >
              ›
            </button>
          </div>
          <Button
            variant="secondary"
            onClick={() => void descargar()}
            disabled={csv.cargando || !cobros.data || cobros.data.totals.turnos === 0}
          >
            {csv.cargando ? 'Generando…' : 'Descargar CSV'}
          </Button>
        </div>
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
            mes={mes}
            pagina={pagina}
            onPagina={setPagina}
            actualizando={cobros.isFetching}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

function Contenido({
  datos,
  mes,
  pagina,
  onPagina,
  actualizando,
}: {
  datos: EarningsView;
  mes: string;
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
          <h2 className="text-[15px] font-semibold text-brand-deep">
            No tuviste cobros en {monthLabel(mes)}
          </h2>
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
