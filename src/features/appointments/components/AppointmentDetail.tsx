import { useQuery } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNow } from '../../../shared/hooks/useNow';
import { IconHistoria, IconTurnos } from '../../../shared/ui/NavIcons';
import { useSession } from '../../auth/hooks/useSession';
import {
  describePolicy,
  MAX_REFUND_PERCENT,
  refundPercentFor,
} from '../../cancellation-policy/lib/policy';
import { usePublicProfile } from '../../catalog/hooks/usePublicProfile';
import { getPaymentStatus } from '../../payments/api/paymentsApi';
import { PaymentReceipt } from '../../payments/components/PaymentReceipt';
import { canPay } from '../../payments/lib/checkout';
import { DeviceCheck } from '../../video/components/DeviceCheck';
import { joinStateOf, timeUntilOpen } from '../../video/lib/joinWindow';
import { useMyAppointments } from '../hooks/useAppointments';
import {
  awaitsPatientChoice,
  canCancel,
  canCancelAsProfessional,
  canMarkNoShow,
  canReportTechnicalFailure,
  counterpartOf,
  formatLongDate,
  isActive,
} from '../lib/myAppointments';
import { reprogramHeadline, showsReason } from '../lib/reprogramCause';
import { appointmentTimeline, cuando, type TimelineStep } from '../lib/timeline';
import { formatPrice } from '../lib/weeks';
import type { Appointment } from '../types/appointment';
import { CancelAppointmentDialog } from './agenda/CancelAppointmentDialog';
import { FullRefundDialog } from './agenda/FullRefundDialog';
import { ProfessionalCancelDialog } from './agenda/ProfessionalCancelDialog';
import { RefundOutcomeBanner } from './agenda/RefundOutcomeBanner';
import { NoShowDialog } from './agenda/NoShowDialog';
import { TechnicalFailureDialog } from './agenda/TechnicalFailureDialog';
import { StatusChip } from './agenda/StatusChip';
import { AppointmentReview } from '../../reviews/components/AppointmentReview';
import { usePendingReviews } from '../../reviews/hooks/useReviews';

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** `2026-10-28` → `Miércoles 28 de octubre de 2026`. */
function longDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${formatLongDate(date)}`;
}

/**
 * El detalle de un turno (ENG-178), como en la app: con quién, cuándo, cuánto,
 * qué pasó desde que se reservó y qué se puede hacer ahora.
 *
 * El turno sale de la lista de "Mis turnos", que ya está en caché. El pago se
 * consulta aparte, solo del lado del paciente, y si falla la historia se arma
 * igual sin ese dato.
 */
export function AppointmentDetail({
  appointmentId,
  variant = 'page',
}: {
  appointmentId: string;
  /** `page`: pantalla propia, en dos columnas. `panel`: al costado de la lista
   *  de "Mis turnos" en pantallas anchas, todo en una columna. */
  variant?: 'page' | 'panel';
}) {
  const panel = variant === 'panel';
  const { user } = useSession();
  const userId = user?.id ?? null;
  const appointments = useMyAppointments();
  const now = useNow();
  const [toCancel, setToCancel] = useState<Appointment | null>(null);
  const [toNoShow, setToNoShow] = useState<Appointment | null>(null);
  const [toProCancel, setToProCancel] = useState<Appointment | null>(null);
  const [toFullRefund, setToFullRefund] = useState<Appointment | null>(null);
  const [toFailure, setToFailure] = useState<Appointment | null>(null);
  const [refundOutcome, setRefundOutcome] = useState<string | null>(null);

  const appointment = appointments.data?.find((a) => a.id === appointmentId) ?? null;
  const isPatient = appointment?.patient?.id === userId;
  // Reseñable sin estar completado: el paciente ya entró a la sala y el
  // profesional todavía no cerró el turno (ENG-190). Eso lo sabe el backend.
  const pendientes = usePendingReviews(appointment !== null && isPatient);
  const pendiente = pendientes.data?.some((p) => p.appointmentId === appointmentId) ?? false;

  const payment = useQuery({
    queryKey: ['payment', appointmentId, 'detalle'],
    queryFn: () => getPaymentStatus(appointmentId),
    enabled: appointment !== null && isPatient,
    retry: false,
  });
  // La política sólo se muestra al paciente que puede cancelar: para el resto no
  // se pide el perfil (`''` lo deshabilita).
  const policy = usePublicProfile(
    appointment && isPatient && canCancel(appointment, userId, now)
      ? (appointment.professional?.id ?? '')
      : '',
  ).data?.cancellationPolicy;

  if (appointments.isPending) {
    return (
      <p role="status" aria-live="polite" className="text-muted">
        Buscando el turno…
      </p>
    );
  }
  if (appointments.isError) {
    return (
      <p role="alert" className="text-danger">
        {appointments.error.message}
      </p>
    );
  }
  if (!appointment) {
    return (
      <div className="grid justify-items-start gap-3">
        <p role="alert" className="text-[17px] font-bold text-brand-deep">
          No encontramos ese turno
        </p>
        <p className="text-sm text-muted">Puede que no sea tuyo o que ya no exista.</p>
        <Link to="/mis-turnos" className="text-sm font-semibold text-brand-hover hover:underline">
          Volver a mis turnos
        </Link>
      </div>
    );
  }

  const person = counterpartOf(appointment, userId);
  const name = person ? `${person.firstName} ${person.lastName}` : 'Sin datos';
  const steps = appointmentTimeline(
    appointment,
    payment.data ?? null,
    now,
    isPatient ? 'PACIENTE' : 'PROFESIONAL',
  );
  const join = joinStateOf(appointment, now);
  const payable = isPatient && canPay(appointment, now);
  const cancellable = canCancel(appointment, userId, now);
  const noShowable = canMarkNoShow(appointment, userId, now);
  // ENG-237: la consulta figura completada pero no se pudo hacer.
  const failureReportable = canReportTechnicalFailure(appointment, userId, now);
  // ENG-204: el profesional cancela un turno suyo que todavía no empezó.
  const proCancellable = !isPatient && canCancelAsProfessional(appointment, userId, now);
  // ENG-204: el profesional canceló un turno pagado y falta que el paciente elija.
  const choosing = awaitsPatientChoice(appointment);
  const plazo = cuando(appointment.reprogramDeadline);
  const profesionalNombre = appointment.professional
    ? `${appointment.professional.firstName} ${appointment.professional.lastName}`
    : 'Tu profesional';
  const reschedulable = cancellable && !appointment.rescheduledAt && appointment.professional;
  // Un turno pagado sólo se reprograma con la anticipación del reembolso total
  // (el backend lo rechaza si no). Se adelanta el aviso con la política del
  // perfil público; el backend sigue siendo la fuente de verdad (ENG-66).
  const reprogramacionCerrada =
    appointment.status === 'CONFIRMADO' &&
    policy !== undefined &&
    refundPercentFor(policy, new Date(appointment.scheduledAt), now) < MAX_REFUND_PERCENT;
  const professionalId = appointment.professional?.id;
  // Un turno a reprogramar no se "vuelve a reservar": se resuelve desde el aviso.
  const rebookable = isPatient && !isActive(appointment) && !choosing && Boolean(professionalId);
  const hayAcciones =
    rebookable ||
    Boolean(reschedulable) ||
    cancellable ||
    noShowable ||
    proCancellable ||
    (!isPatient && !!person);
  // Lo que importa al cancelar es cuánto vuelve hoy; solo si ya se pagó.
  const pctHoy =
    appointment.status === 'CONFIRMADO' && policy
      ? refundPercentFor(policy, new Date(appointment.scheduledAt), now)
      : null;
  const devolucionAhora =
    pctHoy === null
      ? null
      : pctHoy === 0
        ? 'Si cancelás ahora, no hay devolución.'
        : `Si cancelás ahora, te devolvemos el ${pctHoy} %.`;

  return (
    <div className={`grid ${panel ? 'gap-4' : 'gap-6'}`}>
      {!panel && (
        <Link
          to="/mis-turnos"
          className="text-xs font-semibold uppercase tracking-[0.08em] text-muted transition-colors hover:text-brand-deep"
        >
          ← Mis turnos
        </Link>
      )}

      {refundOutcome && (
        <RefundOutcomeBanner text={refundOutcome} onClose={() => setRefundOutcome(null)} />
      )}

      <section
        aria-labelledby="turno-con"
        className="grid gap-5 rounded-[16px] border border-line bg-white p-6"
      >
        <div className="flex flex-wrap items-center gap-4">
          <span
            aria-hidden="true"
            className="flex size-14 flex-none items-center justify-center rounded-full bg-surface-teal text-lg font-bold text-brand-deep"
          >
            {person ? `${person.firstName.charAt(0)}${person.lastName.charAt(0)}` : '?'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              {isPatient ? 'Profesional' : 'Paciente'}
            </p>
            <h2 id="turno-con" className="font-display text-[26px] leading-[1.2] text-brand-deep">
              {name}
            </h2>
          </div>
          <StatusChip status={appointment.status} />
        </div>

        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 border-t border-line-soft pt-5 text-sm">
          <Dato titulo="Día">{longDay(appointment.date)}</Dato>
          <Dato titulo="Hora">
            {appointment.startTime} hs · {appointment.durationMinutes} min
          </Dato>
          <Dato titulo="Modalidad">Videoconsulta</Dato>
          <Dato titulo="Precio">{formatPrice(appointment.price, appointment.currency)}</Dato>
        </dl>

        {choosing && (
          <div
            role="status"
            className="grid gap-3 rounded-[12px] border border-tag-warm-dot/40 bg-tag-warm px-5 py-4 text-sm text-tag-warm-ink"
          >
            <p className="text-[15px] font-bold">
              {reprogramHeadline(
                appointment,
                isPatient,
                profesionalNombre,
                person?.firstName ?? 'El paciente',
              )}
            </p>
            {appointment.cancellationReason && showsReason(appointment) && (
              <p>
                <span className="font-semibold">Motivo:</span> “{appointment.cancellationReason}”
              </p>
            )}
            <p>
              {isPatient
                ? `No pagás nada más ni perdés lo que pagaste: elegí otro horario de ${appointment.professional?.firstName ?? 'tu profesional'} o pedí el reembolso del 100 %${plazo ? `. Si no elegís nada antes del ${plazo}, te lo devolvemos igual, automáticamente` : ''}.`
                : `Puede elegir otro horario tuyo sin volver a pagar o el reembolso del 100 %${plazo ? `. Si no elige antes del ${plazo}, se le devuelve automáticamente` : ''}.`}
            </p>
            {isPatient && (
              <div className="flex flex-wrap gap-3">
                {professionalId && (
                  <Link
                    to={`/profesionales/${professionalId}/turnos?reprogramar=${appointment.id}`}
                    className="inline-flex items-center justify-center rounded-[10px] bg-brand px-5 py-3 text-sm font-bold text-ink-deep transition-colors hover:bg-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                  >
                    Elegir otro horario
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setToFullRefund(appointment)}
                  className="inline-flex items-center justify-center rounded-[10px] border border-tag-warm-ink/30 bg-white px-5 py-3 text-sm font-bold text-tag-warm-ink transition-colors hover:bg-tag-warm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                >
                  Pedir el reembolso del 100 %
                </button>
              </div>
            )}
          </div>
        )}
        {appointment.status === 'CANCELADO' &&
          appointment.cancelledBy !== 'PACIENTE' &&
          appointment.cancellationReason && (
            <p className="text-sm text-muted">
              <span className="font-semibold text-ink">Motivo de la cancelación:</span> “
              {appointment.cancellationReason}”
            </p>
          )}

        {(join.kind === 'OPEN' || payable) && (
          <div className="flex flex-wrap gap-3">
            {join.kind === 'OPEN' ? (
              <Link
                to={`/turnos/${appointment.id}/videoconsulta`}
                className="inline-flex items-center justify-center rounded-[10px] bg-brand px-5 py-3 text-sm font-bold text-ink-deep transition-colors hover:bg-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                Entrar a la sala
              </Link>
            ) : (
              <Link
                to={`/turnos/${appointment.id}/pago`}
                className="inline-flex items-center justify-center rounded-[10px] bg-brand-deep px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                Pagar el turno
              </Link>
            )}
          </div>
        )}
        {join.kind === 'TOO_EARLY' && join.opensAt.getTime() - now.getTime() < 24 * 60 * 60_000 && (
          <p className="text-sm text-muted">
            La sala se abre {timeUntilOpen(join.opensAt, now)}.{' '}
            <Link
              to={`/turnos/${appointment.id}/videoconsulta`}
              className="font-semibold text-brand-hover hover:underline"
            >
              Esperar en la sala
            </Link>
          </p>
        )}
        {/* Con la consulta por delante —abierta o por abrirse—, se puede probar
            la cámara y el micrófono antes, en una sala aparte. */}
        {(join.kind === 'OPEN' || join.kind === 'TOO_EARLY') && <DeviceCheck />}
      </section>

      <div
        className={`grid items-start gap-6 ${panel ? '' : 'lg:grid-cols-[minmax(0,1fr)_320px]'}`}
      >
        <section
          aria-labelledby="que-paso"
          className="rounded-[16px] border border-line bg-white p-6"
        >
          <h2
            id="que-paso"
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
          >
            Qué pasó
          </h2>
          <ol className="mt-4">
            {steps.map((step, i) => (
              <Step key={step.key} step={step} last={i === steps.length - 1} />
            ))}
          </ol>
        </section>

        <div className="grid gap-4">
          {/* El comprobante del pago, solo para el paciente (ENG-199). */}
          {isPatient && payment.data?.receipt && (
            <PaymentReceipt
              titulo="Pago"
              receipt={payment.data.receipt}
              confirmedAt={payment.data.confirmedAt}
              appointment={appointment}
            />
          )}
          {/* La reseña de una consulta que ya se hizo (ENG-80): va aparte,
              no es una acción sobre el turno. */}
          {isPatient && (appointment.status === 'COMPLETADO' || pendiente) && (
            <AppointmentReview
              appointmentId={appointment.id}
              professionalName={
                appointment.professional
                  ? `${appointment.professional.firstName} ${appointment.professional.lastName}`
                  : 'el profesional'
              }
            />
          )}

          <section
            aria-labelledby="acciones"
            className="overflow-hidden rounded-[16px] border border-line bg-white"
          >
            <h2
              id="acciones"
              className="px-6 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
            >
              Acciones
            </h2>

            {hayAcciones ? (
              <ul className="divide-y divide-line-soft border-t border-line-soft">
                {rebookable && (
                  <Accion
                    icon={<IconTurnos />}
                    titulo={`Volver a reservar con ${appointment.professional?.firstName}`}
                    detalle="Elegí otro día y horario."
                    to={`/profesionales/${professionalId}/turnos`}
                  />
                )}
                {reschedulable && !reprogramacionCerrada && (
                  <Accion
                    icon={<IconTurnos />}
                    titulo="Reprogramar"
                    detalle="Pasalo a otro horario. Se puede una sola vez."
                    to={`/profesionales/${professionalId}/turnos?reprogramar=${appointment.id}`}
                  />
                )}
                {reschedulable && reprogramacionCerrada && policy && (
                  <li className="flex items-center gap-3 px-6 py-3.5">
                    <Burbuja>
                      <IconTurnos />
                    </Burbuja>
                    <p className="text-[13px] leading-normal text-muted">
                      Con menos de {policy.hoursFullRefund} horas ya no se puede reprogramar.
                    </p>
                  </li>
                )}
                {cancellable && (
                  <Accion
                    icon={<IconCruz />}
                    titulo="Cancelar turno"
                    detalle={devolucionAhora ?? 'El horario queda libre para otro paciente.'}
                    onClick={() => setToCancel(appointment)}
                    danger
                  />
                )}
                {proCancellable && (
                  <Accion
                    icon={<IconCruz />}
                    titulo="Cancelar turno"
                    detalle={
                      appointment.status === 'CONFIRMADO'
                        ? 'El paciente elige otro horario o el reembolso del 100 %.'
                        : 'La reserva no está paga: se cancela y se le avisa.'
                    }
                    onClick={() => setToProCancel(appointment)}
                    danger
                  />
                )}
                {!isPatient && person && (
                  <Accion
                    icon={<IconHistoria />}
                    titulo="Historia clínica"
                    detalle={`La de ${person.firstName}, para ver y cargar.`}
                    to={`/pacientes/${person.id}/historia-clinica`}
                  />
                )}
                {noShowable && (
                  <Accion
                    icon={<IconCruz />}
                    titulo="Marcar como no asistió"
                    detalle={`Si ${person?.firstName ?? 'el paciente'} no se conectó a la consulta.`}
                    onClick={() => setToNoShow(appointment)}
                    danger
                  />
                )}
                {failureReportable && (
                  <Accion
                    icon={<IconCruz />}
                    titulo="La consulta no se pudo hacer"
                    detalle="Por una falla técnica: el paciente elige otro horario o el reembolso."
                    onClick={() => setToFailure(appointment)}
                    danger
                  />
                )}
              </ul>
            ) : (
              <p className="px-6 pb-5 text-sm text-muted">
                No hay acciones disponibles para este turno.
              </p>
            )}

            {isPatient && cancellable && (
              <div className="grid gap-1.5 border-t border-line-soft bg-surface px-6 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Política de cancelación
                </p>
                <p className="text-xs leading-[1.6] text-muted">
                  {policy
                    ? describePolicy(policy)
                    : 'El plazo y la devolución los define cada profesional.'}
                </p>
                {appointment.rescheduledAt && (
                  <p className="text-xs text-muted-soft">Este turno ya se reprogramó una vez.</p>
                )}
              </div>
            )}
          </section>
        </div>
      </div>

      <CancelAppointmentDialog
        appointment={toCancel}
        now={now}
        onClose={() => setToCancel(null)}
        onCancelled={setRefundOutcome}
      />
      <NoShowDialog appointment={toNoShow} onClose={() => setToNoShow(null)} />
      <ProfessionalCancelDialog
        key={toProCancel?.id ?? 'cerrado'}
        appointment={toProCancel}
        onClose={() => setToProCancel(null)}
        onCancelled={setRefundOutcome}
      />
      <FullRefundDialog
        appointment={toFullRefund}
        onClose={() => setToFullRefund(null)}
        onRefunded={setRefundOutcome}
      />
      <TechnicalFailureDialog
        key={`falla-${toFailure?.id ?? 'cerrado'}`}
        appointment={toFailure}
        onClose={() => setToFailure(null)}
        onReported={setRefundOutcome}
      />
    </div>
  );
}

/** El círculo de color que lleva el ícono de cada acción. */
function Burbuja({ danger = false, children }: { danger?: boolean; children: React.ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-9 flex-none items-center justify-center rounded-full ${
        danger ? 'bg-danger/10 text-danger' : 'bg-surface-teal text-brand-hover'
      }`}
    >
      {children}
    </span>
  );
}

/**
 * Una acción sobre el turno: una fila entera que se toca, con lo que hace
 * debajo del título. El nombre accesible es solo el título; el detalle se lee
 * como descripción.
 */
function Accion({
  icon,
  titulo,
  detalle,
  to,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  titulo: string;
  detalle: string;
  to?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  const detalleId = useId();
  const clase = `group flex w-full items-center gap-3 px-6 py-3.5 text-left transition-colors focus:outline-none focus-visible:bg-surface ${
    danger ? 'hover:bg-danger/5' : 'hover:bg-surface'
  }`;
  const contenido = (
    <>
      <Burbuja danger={danger}>{icon}</Burbuja>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className={`text-sm font-bold ${danger ? 'text-danger' : 'text-brand-deep'}`}>
          {titulo}
        </span>
        <span id={detalleId} className="text-[13px] leading-normal text-muted">
          {detalle}
        </span>
      </span>
      <span
        aria-hidden="true"
        className="flex-none text-muted transition-transform group-hover:translate-x-0.5"
      >
        ›
      </span>
    </>
  );
  return (
    <li>
      {to ? (
        <Link to={to} aria-label={titulo} aria-describedby={detalleId} className={clase}>
          {contenido}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onClick}
          aria-label={titulo}
          aria-describedby={detalleId}
          className={clase}
        >
          {contenido}
        </button>
      )}
    </li>
  );
}

/** Cancelar o marcar que no vino: un círculo con la cruz. */
function IconCruz() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-[18px] w-[18px] flex-none"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </svg>
  );
}

function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-muted">{titulo}</dt>
      <dd className="mt-0.5 font-semibold text-ink">{children}</dd>
    </div>
  );
}

const DOT: Record<TimelineStep['tone'], string> = {
  done: 'border-brand bg-brand',
  current: 'border-tag-warm-dot bg-tag-warm-dot',
  pending: 'border-line-strong bg-white',
  bad: 'border-danger bg-danger',
};

/** Un paso de la historia: un punto, la línea que lo une con el siguiente y el texto. */
function Step({ step, last }: { step: TimelineStep; last: boolean }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden="true" className="flex w-3.5 flex-none flex-col items-center">
        <span className={`mt-1 size-3 rounded-full border-2 ${DOT[step.tone]}`} />
        {!last && <span className="my-1 w-0.5 flex-1 bg-line" />}
      </span>
      <span className={`min-w-0 ${last ? '' : 'pb-5'}`}>
        <span
          className={`block text-sm font-semibold ${step.tone === 'pending' ? 'text-muted' : 'text-ink'}`}
        >
          {step.title}
        </span>
        {step.when && <span className="block text-xs text-muted">{step.when}</span>}
      </span>
    </li>
  );
}
