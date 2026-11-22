import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ACTIVITY_PERIODS,
  activityRange,
  barHeights,
  DEFAULT_ACTIVITY_PERIOD,
  formatRating,
  monthLong,
  monthShort,
  plural,
  type ActivityPeriod,
} from '../features/activity/lib/activity';
import type { PlatformStats } from '../features/admin/api/adminApi';
import { IntegrityCard } from '../features/admin/components/IntegrityCard';
import { usePlatformStats } from '../features/admin/hooks/useAdmin';
import { formatPrice } from '../features/appointments/lib/weeks';
import { useNow } from '../shared/hooks/useNow';
import { DashboardLayout } from './DashboardLayout';

const ROTULO = 'text-[11px] font-semibold uppercase tracking-[0.12em] text-muted';
const TARJETA = 'rounded-[14px] border border-line bg-white p-5';

/**
 * Plataforma (ENG-195): cómo se usa MediConnect y si la historia clínica sigue
 * íntegra, para el administrador.
 *
 * Arriba, la integridad de la historia clínica: es lo que primero tiene que
 * saber quien administra, y el diferencial del proyecto. Después los totales,
 * los turnos por mes y el detalle de profesionales y turnos. El período es el
 * mismo selector que "Mi actividad". **Solo agregados**: ningún dato de una
 * persona.
 */
export function AdminPlatformPage() {
  const now = useNow(60 * 60_000);
  const [periodo, setPeriodo] = useState<ActivityPeriod>(DEFAULT_ACTIVITY_PERIOD);
  const stats = usePlatformStats(activityRange(periodo, now));

  return (
    <DashboardLayout
      barTitle="Plataforma"
      greeting="Plataforma"
      subtitle="Cómo se usa MediConnect y si la historia clínica sigue íntegra."
    >
      <div className="grid gap-6">
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
          <p role="status" aria-live="polite" className="text-sm text-muted">
            Cargando las métricas…
          </p>
        ) : stats.isError ? (
          <div
            role="alert"
            className="rounded-[14px] border border-danger/30 bg-danger/5 px-5 py-4 text-sm text-danger"
          >
            <p>{stats.error.message}</p>
            <button
              type="button"
              onClick={() => void stats.refetch()}
              className="mt-2 font-semibold underline"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <Metricas datos={stats.data} />
        )}
      </div>
    </DashboardLayout>
  );
}

function Metricas({ datos }: { datos: PlatformStats }) {
  const { usuarios, profesionales, turnos, cobros, resenas } = datos;
  return (
    <>
      <IntegrityCard check={datos.integridad} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          etiqueta="Usuarios"
          valor={String(usuarios.pacientes + usuarios.profesionales)}
          detalle={`${plural(usuarios.pacientes, 'paciente')} y ${plural(usuarios.profesionales, 'profesional', 'profesionales')} · ${plural(usuarios.nuevos, 'nuevo')} en el período`}
        />
        <Tile
          etiqueta="Turnos del período"
          valor={String(turnos.total)}
          detalle={`${plural(turnos.completados, 'consulta completada', 'consultas completadas')}`}
        />
        <Tile
          etiqueta="Cobrado neto"
          valor={formatPrice(cobros.neto, cobros.moneda)}
          detalle={`${formatPrice(cobros.cobrado, cobros.moneda)} cobrado · ${formatPrice(cobros.reembolsado, cobros.moneda)} reembolsado`}
        />
        <Tile
          etiqueta="Reseñas"
          valor={resenas.promedio !== null ? `${formatRating(resenas.promedio)} ★` : '—'}
          detalle={
            resenas.cantidad > 0 ? plural(resenas.cantidad, 'reseña') : 'Sin reseñas en el período'
          }
        />
      </div>

      <PorMes meses={turnos.porMes} />

      <div className="grid gap-3 lg:grid-cols-2">
        <section aria-label="Profesionales" className={TARJETA}>
          <p className={ROTULO}>Profesionales</p>
          <dl className="mt-3 grid gap-2 text-sm">
            <Fila etiqueta="Validados" valor={profesionales.validados} />
            <Fila
              etiqueta="Con la matrícula pendiente"
              valor={profesionales.pendientes}
              accion={
                profesionales.pendientes > 0 ? (
                  <Link
                    to="/admin/matriculas"
                    className="font-semibold text-brand-hover hover:underline"
                  >
                    Revisar
                  </Link>
                ) : null
              }
            />
            <Fila etiqueta="Suspendidos" valor={profesionales.suspendidos} />
            <Fila etiqueta="Con la matrícula rechazada" valor={profesionales.rechazados} />
          </dl>
          {profesionales.porEspecialidad.length > 0 && (
            <>
              <p className={`${ROTULO} mt-5`}>Validados por especialidad</p>
              <ul className="mt-3 grid gap-2" aria-label="Profesionales validados por especialidad">
                {profesionales.porEspecialidad.map((e) => (
                  <li key={e.especialidad} className="grid gap-1 text-sm">
                    <span className="flex justify-between gap-3">
                      <span className="text-ink">{e.especialidad}</span>
                      <span className="font-semibold tabular-nums text-brand-deep">
                        {e.profesionales}
                      </span>
                    </span>
                    <span aria-hidden="true" className="h-1.5 rounded-full bg-line-soft">
                      <span
                        className="block h-full rounded-full bg-brand"
                        style={{
                          width: `${Math.round(
                            (e.profesionales /
                              Math.max(
                                1,
                                ...profesionales.porEspecialidad.map((x) => x.profesionales),
                              )) *
                              100,
                          )}%`,
                        }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section aria-label="Turnos por estado" className={TARJETA}>
          <p className={ROTULO}>Turnos del período por estado</p>
          <dl className="mt-3 grid gap-2 text-sm">
            <Fila etiqueta="Completados" valor={turnos.completados} />
            <Fila
              etiqueta="Por resolver (confirmados, sin pagar o a reprogramar)"
              valor={turnos.pendientes}
            />
            <Fila etiqueta="Cancelados" valor={turnos.cancelados} />
            <Fila etiqueta="El paciente no asistió" valor={turnos.noAsistio} />
            <Fila etiqueta="Liberados por falta de pago" valor={turnos.liberados} />
          </dl>
          <p className="mt-4 text-xs text-muted">
            {plural(cobros.pagos, 'pago acreditado', 'pagos acreditados')} en el período.
          </p>
        </section>
      </div>
    </>
  );
}

function Tile({ etiqueta, valor, detalle }: { etiqueta: string; valor: string; detalle: string }) {
  return (
    <div role="group" aria-label={etiqueta} className={TARJETA}>
      <p className={ROTULO}>{etiqueta}</p>
      <p className="font-display mt-2 text-[30px] leading-none tabular-nums text-brand-deep">
        {valor}
      </p>
      <p className="mt-2 text-xs text-muted">{detalle}</p>
    </div>
  );
}

function Fila({
  etiqueta,
  valor,
  accion,
}: {
  etiqueta: string;
  valor: number;
  accion?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink">{etiqueta}</dt>
      <dd className="flex items-baseline gap-3">
        {accion}
        <span
          className={`font-semibold tabular-nums ${valor === 0 ? 'text-muted' : 'text-brand-deep'}`}
        >
          {valor}
        </span>
      </dd>
    </div>
  );
}

/** Turnos por mes, con la parte completada resaltada. Divs, sin librería de gráficos. */
function PorMes({ meses }: { meses: PlatformStats['turnos']['porMes'] }) {
  const altos = barHeights(meses.map((m) => m.turnos));
  const max = Math.max(0, ...meses.map((m) => m.turnos));
  return (
    <div className={TARJETA}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <p className={ROTULO}>Turnos por mes</p>
        <p className="flex items-center gap-3 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-sm bg-brand" />
            Completados
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2.5 rounded-sm bg-surface-teal ring-1 ring-brand/30"
            />
            Resto
          </span>
        </p>
      </div>
      <ol
        aria-label="Turnos por mes"
        className={`mt-4 flex h-[180px] items-end ${meses.length > 6 ? 'gap-1' : 'gap-3'}`}
      >
        {meses.map((m, i) => (
          <li key={m.mes} className="flex h-full min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className="sr-only">
              {monthLong(m.mes)}: {plural(m.turnos, 'turno')}, {plural(m.completados, 'completado')}
            </span>
            <span aria-hidden="true" className="text-xs font-semibold tabular-nums text-brand-deep">
              {m.turnos}
            </span>
            <span aria-hidden="true" className="flex w-full flex-1 items-end justify-center">
              {m.turnos === 0 ? (
                <span className="block h-[2px] w-full max-w-[44px] bg-line" />
              ) : (
                <span
                  data-testid="barra"
                  className="flex w-full max-w-[44px] flex-col justify-end overflow-hidden rounded-t-[6px] bg-surface-teal ring-1 ring-inset ring-brand/30"
                  style={{ height: `${Math.max(altos[i], 3)}%` }}
                >
                  <span
                    className="block w-full bg-brand"
                    style={{
                      height: `${max === 0 ? 0 : Math.round((m.completados / m.turnos) * 100)}%`,
                    }}
                  />
                </span>
              )}
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
