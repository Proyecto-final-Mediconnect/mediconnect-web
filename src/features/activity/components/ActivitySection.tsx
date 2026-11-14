import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
import { DashboardSection } from '../../dashboard/components/PanelPieces';
import { useMyStats } from '../hooks/useMyStats';
import {
  ACTIVITY_PERIODS,
  activityRange,
  barHeights,
  DEFAULT_ACTIVITY_PERIOD,
  formatRate,
  formatRating,
  isEmptyPeriod,
  monthLong,
  monthShort,
  plural,
  rateBase,
  type ActivityPeriod,
} from '../lib/activity';
import type { ProfessionalStats } from '../types';

const ROTULO = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-muted';
const TARJETA = 'rounded-[14px] border border-line bg-white p-5';

/**
 * "Mi actividad" del panel del profesional (ENG-196): cuántas consultas hizo,
 * cuántas se cayeron y cómo lo califican, en el mes, los últimos 3 o los
 * últimos 12 meses.
 *
 * Las tasas se muestran con su base ("8,0 %" y "2 de 25 turnos") y, sin base,
 * con una raya: un 0 % sin turnos diría algo que no pasó. Sin ningún turno ni
 * reseña en el período, un estado vacío en lugar de una fila de ceros.
 *
 * Tarjetas blancas: en el panel la única oscura es la próxima consulta.
 */
export function ActivitySection() {
  const [periodo, setPeriodo] = useState<ActivityPeriod>(DEFAULT_ACTIVITY_PERIOD);
  const { from, to } = activityRange(periodo);
  const stats = useMyStats(from, to);

  return (
    <DashboardSection title="Mi actividad">
      <div role="group" aria-label="Período" className="flex flex-wrap gap-2">
        {ACTIVITY_PERIODS.map((p) => {
          const activo = p.value === periodo;
          return (
            <button
              key={p.value}
              type="button"
              aria-pressed={activo}
              onClick={() => setPeriodo(p.value)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                activo
                  ? 'border-brand-deep bg-brand-deep text-white'
                  : 'border-line-strong bg-white text-brand-deep hover:border-brand'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {stats.isPending ? (
        <Esqueleto />
      ) : stats.isError && !stats.data ? (
        <div role="alert" className="grid justify-items-start gap-3">
          <p className="text-sm text-danger">{stats.error.message}</p>
          <Button variant="secondary" onClick={() => void stats.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <div
          aria-busy={stats.isFetching}
          className={`grid gap-3 transition-opacity ${stats.isFetching ? 'opacity-60' : ''}`}
        >
          {isEmptyPeriod(stats.data) ? (
            <div className={`${TARJETA} text-center`}>
              <p className="text-[15px] font-semibold text-brand-deep">
                Todavía no tenés consultas en este período.
              </p>
              <p className="mt-1 text-sm text-muted">
                Cuando atiendas, acá vas a ver cuántas consultas hiciste, cuántas se cayeron y cómo
                te califican.
              </p>
            </div>
          ) : (
            <Contenido datos={stats.data} />
          )}
        </div>
      )}
    </DashboardSection>
  );
}

function Contenido({ datos }: { datos: ProfessionalStats }) {
  const { turnos, tasas, resenas, pacientes } = datos;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          etiqueta="Consultas completadas"
          valor={String(turnos.completados)}
          apagado={turnos.completados === 0}
          detalle={`${plural(turnos.porVenir, 'turno confirmado', 'turnos confirmados')} por venir`}
        />
        <Tile
          etiqueta="Cancelaciones"
          valor={formatRate(tasas.cancelacion)}
          apagado={!tasas.cancelacion}
          detalle={
            tasas.cancelacion
              ? `${rateBase(tasas.cancelacion)} turnos`
              : 'Sin turnos cerrados para calcularla'
          }
        />
        <Tile
          etiqueta="Ausentismo"
          valor={formatRate(tasas.ausentismo)}
          apagado={!tasas.ausentismo}
          detalle={
            tasas.ausentismo
              ? `${rateBase(tasas.ausentismo)} turnos sin el paciente`
              : 'Sin turnos cerrados para calcularlo'
          }
        />
        <Tile
          etiqueta="Calificación"
          valor={resenas.promedio === null ? '—' : `${formatRating(resenas.promedio)} ★`}
          apagado={resenas.promedio === null}
          detalle={
            resenas.cantidad === 0 ? (
              'Sin reseñas en este período'
            ) : (
              <>
                {plural(resenas.cantidad, 'reseña')}
                {resenas.sinResponder > 0 && (
                  <>
                    {' · '}
                    <Link
                      to="/profesional/resenas"
                      className="font-semibold text-brand-hover hover:underline"
                    >
                      {resenas.sinResponder} sin responder
                    </Link>
                  </>
                )}
              </>
            )
          }
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_260px]">
        <PorMes meses={datos.consultasPorMes} />
        <div className={TARJETA}>
          <p className={ROTULO}>Pacientes</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Numero valor={pacientes.unicos} detalle="atendiste" />
            <Numero valor={pacientes.recurrentes} detalle="volvieron más de una vez" />
          </div>
          <dl className="mt-4 grid gap-2 border-t border-line-soft pt-4 text-sm">
            <Fila etiqueta="Turnos cancelados" valor={turnos.cancelados} />
            <Fila etiqueta="Turnos sin el paciente" valor={turnos.noAsistio} />
            <Fila etiqueta="Reservas sin pagar liberadas" valor={turnos.liberados} />
          </dl>
        </div>
      </div>
    </>
  );
}

function Tile({
  etiqueta,
  valor,
  detalle,
  apagado,
}: {
  etiqueta: string;
  valor: string;
  detalle: ReactNode;
  apagado: boolean;
}) {
  return (
    <div role="group" aria-label={etiqueta} className={TARJETA}>
      <p className={ROTULO}>{etiqueta}</p>
      <p
        className={`font-display mt-2 text-[32px] leading-none tabular-nums ${
          apagado ? 'text-muted' : 'text-brand-deep'
        }`}
      >
        {valor}
      </p>
      <p className="mt-2 text-xs text-muted">{detalle}</p>
    </div>
  );
}

/** Barras de consultas completadas por mes, con divs: sin librería de gráficos. */
function PorMes({ meses }: { meses: ProfessionalStats['consultasPorMes'] }) {
  const altos = barHeights(meses.map((m) => m.consultas));
  return (
    <div className={TARJETA}>
      <p className={ROTULO}>Consultas completadas por mes</p>
      <ol
        aria-label="Consultas completadas por mes"
        className={`mt-4 flex h-[160px] items-end ${meses.length > 6 ? 'gap-1' : 'gap-3'}`}
      >
        {meses.map((m, i) => (
          <li key={m.mes} className="flex h-full min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className="sr-only">
              {monthLong(m.mes)}: {plural(m.consultas, 'consulta')}
            </span>
            <span aria-hidden="true" className="text-xs font-semibold tabular-nums text-brand-deep">
              {m.consultas}
            </span>
            <span aria-hidden="true" className="flex w-full flex-1 items-end justify-center">
              <span
                data-testid="barra"
                className={`block w-full max-w-[44px] rounded-t-[6px] ${
                  m.consultas === 0 ? 'h-[2px] bg-line' : 'bg-brand'
                }`}
                style={m.consultas === 0 ? undefined : { height: `${Math.max(altos[i], 3)}%` }}
              />
            </span>
            <span aria-hidden="true" className="text-[11px] text-muted">
              {monthShort(m.mes)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Numero({ valor, detalle }: { valor: number; detalle: string }) {
  return (
    <p>
      <span
        className={`font-display block text-[28px] leading-none tabular-nums ${
          valor === 0 ? 'text-muted' : 'text-brand-deep'
        }`}
      >
        {valor}
      </span>
      <span className="mt-1 block text-xs text-muted">{detalle}</span>
    </p>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{etiqueta}</dt>
      <dd className="font-semibold tabular-nums text-brand-deep">{valor}</dd>
    </div>
  );
}

function Esqueleto() {
  return (
    <div role="status" aria-label="Cargando tu actividad" className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[112px] animate-pulse rounded-[14px] bg-line-soft" />
        ))}
      </div>
      <div className="h-[220px] animate-pulse rounded-[14px] bg-line-soft" />
    </div>
  );
}
