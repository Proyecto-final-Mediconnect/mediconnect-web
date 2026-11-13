import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { StatusChip } from '../../appointments/components/agenda/StatusChip';
import { useNow } from '../../../shared/hooks/useNow';
import { formatLongDate } from '../../appointments/lib/myAppointments';
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

/** Rótulo de sección en versalitas, con una acción opcional a la derecha. Es
 *  el mismo en los dos paneles. */
export function DashboardSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-3" aria-label={title}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          {title}
        </h2>
        {action}
      </div>
      {children}
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
  canPay = false,
  primaryAction,
}: {
  appointment: Appointment;
  /** "Profesional" o "Paciente", según quién esté mirando. */
  counterpartLabel: string;
  counterpartName: string | null;
  /**
   * Solo el paciente paga. El profesional ve el mismo turno sin pagar, pero el
   * botón no es suyo: lo llevaría al checkout de su propio paciente.
   */
  canPay?: boolean;
  /** El botón principal cuando no hay sala abierta ni pago: la historia
   *  clínica del paciente, para el profesional. */
  primaryAction?: { to: string; label: string };
}) {
  const now = useNow();
  const joinState = joinStateOf(appointment, now);
  const sinPagar = canPay && appointment.status === 'RESERVADO_SIN_PAGAR';

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

        <StatusChip status={appointment.status} onDark />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {joinState.kind === 'OPEN' ? (
          <Link
            to={`/turnos/${appointment.id}/videoconsulta`}
            className="inline-flex items-center rounded-[9px] bg-brand px-5 py-3 text-sm font-bold text-ink-deep transition-colors hover:bg-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright focus-visible:ring-offset-2 focus-visible:ring-offset-night"
          >
            Ingresar a videoconsulta
          </Link>
        ) : sinPagar ? (
          <Link
            to={`/turnos/${appointment.id}/pago`}
            className="inline-flex items-center rounded-[9px] bg-brand px-5 py-3 text-sm font-bold text-ink-deep transition-colors hover:bg-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright focus-visible:ring-offset-2 focus-visible:ring-offset-night"
          >
            Pagar la consulta
          </Link>
        ) : (
          primaryAction && (
            <Link
              to={primaryAction.to}
              className="inline-flex items-center rounded-[9px] bg-brand px-5 py-3 text-sm font-bold text-ink-deep transition-colors hover:bg-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright focus-visible:ring-offset-2 focus-visible:ring-offset-night"
            >
              {primaryAction.label}
            </Link>
          )
        )}

        <Link
          to={`/turnos/${appointment.id}`}
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
  secundaria,
}: {
  titulo: string;
  detalle: string;
  accion?: { to: string; label: string };
  secundaria?: { to: string; label: string };
}) {
  return (
    // En pantallas anchas va en una franja: texto a la izquierda, acción a la
    // derecha. Un bloque alto con dos líneas adentro dejaba media tarjeta vacía.
    <article className="flex flex-wrap items-center justify-between gap-5 rounded-[14px] border border-dashed border-line-strong bg-white p-6 lg:p-7">
      <div className="min-w-0 flex-1 basis-[320px]">
        <p className="font-display text-[24px] leading-[1.2] text-brand-deep">{titulo}</p>
        <p className="mt-2 max-w-[560px] text-sm leading-[1.6] text-muted">{detalle}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {accion && (
          <Link
            to={accion.to}
            className="inline-flex flex-none items-center rounded-[9px] bg-brand-deep px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            {accion.label}
          </Link>
        )}
        {secundaria && (
          <Link
            to={secundaria.to}
            className="inline-flex flex-none items-center rounded-[9px] border border-line-strong bg-white px-5 py-3 text-sm font-bold text-brand-deep transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            {secundaria.label}
          </Link>
        )}
      </div>
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

const ICONS = {
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2',
  doc: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 21a7 7 0 0 1 14 0',
  calendar: 'M5 5h14v15H5zM16 3v4M8 3v4M5 10h14',
  star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9z',
} as const;

/** Acceso de la columna lateral: ícono, qué es y una línea de su estado. */
export function IconTile({
  to,
  title,
  detail,
  icon,
  warn = false,
}: {
  to: string;
  title: string;
  detail: string;
  icon: keyof typeof ICONS;
  /** Algo falta y bloquea: el ícono y la línea van en ámbar. */
  warn?: boolean;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-[14px] border border-line bg-white p-4 transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <span
        aria-hidden="true"
        className={`flex size-11 flex-none items-center justify-center rounded-[12px] ${
          warn ? 'bg-tag-warm text-tag-warm-ink' : 'bg-surface-teal text-brand-deep'
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={ICONS[icon]} />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-brand-deep">{title}</span>
        <span className={`block text-sm ${warn ? 'text-tag-warm-ink' : 'text-muted'}`}>
          {detail}
        </span>
      </span>
      <span aria-hidden="true" className="text-muted-soft">
        ›
      </span>
    </Link>
  );
}
