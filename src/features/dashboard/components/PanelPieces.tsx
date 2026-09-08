import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useNow } from '../../../shared/hooks/useNow';
import { formatLongDate, statusLabel } from '../../appointments/lib/myAppointments';
import { formatPrice } from '../../appointments/lib/weeks';
import type { Appointment } from '../../appointments/types/appointment';
import { joinStateOf, timeUntilOpen } from '../../video/lib/joinWindow';
import type { PendingTask } from '../lib/dashboard';

/**
 * Piezas compartidas por los dos paneles (ENG-44).
 *
 * Están juntas y no en un archivo por componente porque son cuatro bloques
 * chicos que solo existen para el panel: separarlos daría cuatro archivos de
 * treinta líneas que siempre se editan al mismo tiempo.
 */

/** Rótulo de sección: filete arriba, número y texto en versalitas. Es el mismo
 *  patrón que ordena la landing y "Mis turnos". */
export function PanelSection({
  numero,
  titulo,
  accion,
  children,
}: {
  numero: string;
  titulo: string;
  accion?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`panel-${numero}`}>
      <div className="flex items-baseline justify-between gap-4 border-t border-brand-deep pt-4">
        <div className="flex items-baseline gap-4">
          <span className="text-xs font-semibold text-brand">{numero}</span>
          <h2
            id={`panel-${numero}`}
            className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted"
          >
            {titulo}
          </h2>
        </div>
        {accion}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * El próximo turno, en oscuro.
 *
 * Es la única tarjeta oscura del panel a propósito: hay exactamente una cosa que
 * el usuario vino a mirar, y el contraste la señala sin necesidad de un título
 * que diga "importante".
 */
export function NextAppointmentCard({
  appointment,
  counterpartLabel,
  counterpartName,
}: {
  appointment: Appointment;
  /** "Profesional" o "Paciente", según quién esté mirando. */
  counterpartLabel: string;
  counterpartName: string | null;
}) {
  const now = useNow();
  const joinState = joinStateOf(appointment, now);
  const sinPagar = appointment.status === 'RESERVADO_SIN_PAGAR';

  return (
    <article className="rounded-[14px] border border-night bg-night p-7 text-white lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {/* Sin rótulo propio: la sección que envuelve esta tarjeta ya se llama
              "Tu próxima consulta", y repetirlo dos veces seguidas no agrega
              nada. */}
          <p className="font-display text-[30px] leading-[1.1] text-white lg:text-[38px]">
            {formatLongDate(appointment.date)}
          </p>
          <p className="mt-2 text-[17px] font-bold text-white">
            {appointment.startTime} · {appointment.durationMinutes} min
          </p>
          <p className="mt-2.5 text-sm text-on-night">
            {counterpartName
              ? `${counterpartLabel}: ${counterpartName}`
              : `${counterpartLabel} no disponible`}
            {' · '}
            {formatPrice(appointment.price, appointment.currency)}
          </p>
        </div>

        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-on-night-strong">
          {statusLabel(appointment.status)}
        </span>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {joinState.kind === 'OPEN' ? (
          <Link
            to={`/turnos/${appointment.id}/videoconsulta`}
            className="inline-flex items-center rounded-[9px] bg-brand px-5 py-3 text-sm font-bold text-ink-deep transition-colors hover:bg-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright focus-visible:ring-offset-2 focus-visible:ring-offset-night"
          >
            Ingresar a videoconsulta
          </Link>
        ) : (
          sinPagar && (
            <Link
              to={`/turnos/${appointment.id}/pago`}
              className="inline-flex items-center rounded-[9px] bg-brand px-5 py-3 text-sm font-bold text-ink-deep transition-colors hover:bg-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright focus-visible:ring-offset-2 focus-visible:ring-offset-night"
            >
              Pagar la consulta
            </Link>
          )
        )}

        <Link
          to="/mis-turnos"
          className="inline-flex items-center rounded-[9px] border border-white/25 px-5 py-3 text-sm font-bold text-white transition-colors hover:border-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright focus-visible:ring-offset-2 focus-visible:ring-offset-night"
        >
          Ver el detalle
        </Link>
      </div>

      {/* Mismo criterio que "Mis turnos": el aviso solo aparece dentro de las 24
          horas. En un turno de la semana que viene, "se abre en 6 días" es ruido. */}
      {joinState.kind === 'TOO_EARLY' &&
        joinState.opensAt.getTime() - now.getTime() < 24 * 60 * 60_000 && (
          <p className="mt-4 text-[13px] text-on-night">
            La sala se abre {timeUntilOpen(joinState.opensAt, now)}.
          </p>
        )}
    </article>
  );
}

/** Sin turnos próximos: en vez de una tarjeta vacía, el paso siguiente. */
export function NoNextAppointment({
  titulo,
  detalle,
  accion,
}: {
  titulo: string;
  detalle: string;
  accion?: { to: string; label: string };
}) {
  return (
    <article className="rounded-[14px] border border-dashed border-line-strong bg-white p-7">
      <p className="font-display text-[24px] leading-[1.2] text-brand-deep">{titulo}</p>
      <p className="mt-2 max-w-[520px] text-sm leading-[1.6] text-muted">{detalle}</p>
      {accion && (
        <Link
          to={accion.to}
          className="mt-5 inline-flex items-center rounded-[9px] bg-brand-deep px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          {accion.label}
        </Link>
      )}
    </article>
  );
}

/**
 * Lo que falta para poder operar.
 *
 * Un `blocker` va con el borde y el número en rojo: no es una sugerencia de
 * completitud, es una operación que hoy devuelve error. El `warning` usa el
 * mismo formato en gris para que la diferencia se lea de un vistazo.
 */
export function PendingTaskList({ tasks }: { tasks: PendingTask[] }) {
  return (
    <ul className="grid gap-3">
      {tasks.map((task) => {
        const bloquea = task.severity === 'blocker';

        return (
          <li
            key={task.id}
            className={`flex flex-wrap items-start justify-between gap-4 rounded-[14px] border p-5 ${
              bloquea ? 'border-danger/35 bg-danger/[0.04]' : 'border-line bg-white'
            }`}
          >
            <div className="min-w-0 max-w-[620px]">
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className={`inline-block h-1.5 w-1.5 flex-none rounded-full ${
                    bloquea ? 'bg-danger' : 'bg-muted-soft'
                  }`}
                />
                <h3 className="text-[15px] font-bold text-brand-deep">{task.title}</h3>
              </div>
              <p className="mt-1.5 pl-5 text-[13px] leading-[1.6] text-muted">{task.detail}</p>
            </div>

            {task.to && (
              <Link
                to={task.to}
                className="rounded-[9px] border border-line-strong bg-white px-4 py-2.5 text-[13px] font-bold text-brand-deep transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                {task.cta ?? 'Resolver'}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Un número y qué significa. Los dígitos van en Newsreader, como el resto de
 *  las cifras grandes del sistema. */
export function StatTile({
  valor,
  etiqueta,
  to,
}: {
  valor: number | string;
  etiqueta: string;
  to?: string;
}) {
  const contenido = (
    <>
      <span className="font-display block text-[38px] leading-none text-brand-deep tabular-nums">
        {valor}
      </span>
      <span className="mt-2.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
        {etiqueta}
      </span>
    </>
  );

  const clases = 'block rounded-[14px] border border-line bg-white p-5';

  return to ? (
    <Link
      to={to}
      className={`${clases} transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2`}
    >
      {contenido}
    </Link>
  ) : (
    <div className={clases}>{contenido}</div>
  );
}

/** Acceso a una sección, con una línea de qué se hace ahí. */
export function QuickLink({
  title,
  description,
  to,
}: {
  title: string;
  description: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-start justify-between gap-4 rounded-[14px] border border-line bg-white p-5 transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-bold text-brand-deep">{title}</span>
        <span className="mt-1.5 block text-[13px] leading-[1.6] text-muted">{description}</span>
      </span>
      <span
        aria-hidden="true"
        className="mt-0.5 flex-none text-brand-hover transition-transform group-hover:translate-x-0.5"
      >
        →
      </span>
    </Link>
  );
}
