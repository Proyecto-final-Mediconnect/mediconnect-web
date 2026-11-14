import type { PaymentStatusView } from '../../payments/types/payment';
import type { Appointment } from '../types/appointment';
import { isActive } from './myAppointments';
import { formatDate, formatPrice } from './weeks';

/**
 * "Qué pasó" con un turno, de la reserva a la consulta (ENG-178), con los
 * mismos pasos que la app (ENG-169).
 *
 * Se arma con lo que hay: el estado del turno, el del pago y, si el backend las
 * manda, las fechas de cada paso. Un paso sin fecha se muestra igual: que se
 * pagó importa aunque no se sepa a qué hora.
 */

export type StepTone = 'done' | 'current' | 'pending' | 'bad';

export interface TimelineStep {
  key: string;
  title: string;
  /** `21 de octubre · 21:35`, o `null` si no se sabe cuándo. */
  when: string | null;
  tone: StepTone;
}

const AR = 'America/Argentina/Buenos_Aires';

/** Un instante ISO en hora argentina: `21 de octubre · 21:35`. */
export function cuando(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const instante = new Date(iso);
  if (Number.isNaN(instante.getTime())) return null;
  const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: AR }).format(instante);
  const hora = new Intl.DateTimeFormat('es-AR', {
    timeZone: AR,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instante);
  return `${formatDate(fecha)} · ${hora}`;
}

/** Quién mira la línea de tiempo: los pasos se cuentan desde su lugar. */
export type TimelineViewer = 'PACIENTE' | 'PROFESIONAL';

/**
 * En qué quedó el reembolso de un turno que se cayó (ENG-174), dicho al
 * paciente. `null` si no hubo reembolso. Lo usan la línea de tiempo y "Mis
 * turnos".
 *
 * Solo para el paciente: el backend manda `refundState` únicamente a quien pagó
 * el turno, y al profesional le llega `null`.
 *
 * Con más de un reembolso el backend suma los no rechazados y manda el estado
 * más urgente (PENDIENTE > RECHAZADO > PROCESADO). Por eso el pendiente habla
 * del total "en curso" (parte puede estar acreditada) y el rechazado no dice
 * monto: con uno acreditado y otro rechazado, el que llega es lo acreditado.
 */
export function refundStep(appointment: Appointment): { title: string; tone: StepTone } | null {
  const refund = appointment.refundState;
  if (!refund) return null;
  const monto = formatPrice(refund.amount, appointment.currency);
  switch (refund.status) {
    case 'PENDIENTE':
      return { title: `Reembolso de ${monto} en curso`, tone: 'current' };
    case 'PROCESADO':
      return { title: `Te devolvimos ${monto}`, tone: 'done' };
    case 'RECHAZADO':
      return {
        title: 'Hubo un problema con el reembolso. Escribinos y lo revisamos',
        tone: 'bad',
      };
    default:
      // Un estado nuevo del backend: mejor nada que un texto que no corresponde.
      return null;
  }
}

export function appointmentTimeline(
  appointment: Appointment,
  payment: PaymentStatusView | null,
  now: Date = new Date(),
  viewer: TimelineViewer = 'PACIENTE',
): TimelineStep[] {
  const paciente = viewer === 'PACIENTE';
  const pasos: TimelineStep[] = [
    {
      key: 'reserva',
      title: paciente ? 'Reservaste el turno' : 'El paciente reservó el turno',
      when: cuando(appointment.createdAt),
      tone: 'done',
    },
  ];
  const { status } = appointment;

  // El pago. Sin dato del pago, se deduce del estado: un turno confirmado se pagó.
  // Con un reembolso registrado (ENG-174) también se pagó, y lo que se devolvió
  // va en su propio paso después de la cancelación: así un parcial no se lee
  // como "te devolvimos el pago" ni uno pendiente desaparece.
  const pago = payment?.status;
  const reembolso = paciente ? refundStep(appointment) : null;
  if (
    pago === 'APROBADO' ||
    (reembolso && pago !== 'RECHAZADO') ||
    (!pago && ['CONFIRMADO', 'COMPLETADO', 'NO_ASISTIO'].includes(status))
  ) {
    pasos.push({
      key: 'pago',
      title: paciente
        ? `Pagaste ${formatPrice(appointment.price, appointment.currency)} con MercadoPago`
        : 'Pago acreditado',
      when: cuando(payment?.confirmedAt),
      tone: 'done',
    });
  } else if (pago === 'REEMBOLSADO') {
    pasos.push({
      key: 'pago',
      title: paciente ? 'Te devolvimos el pago' : 'Se devolvió el pago',
      when: null,
      tone: 'done',
    });
  } else if (pago === 'RECHAZADO' && status === 'RESERVADO_SIN_PAGAR') {
    pasos.push({ key: 'pago', title: 'MercadoPago rechazó el pago', when: null, tone: 'bad' });
  } else if (status === 'RESERVADO_SIN_PAGAR') {
    pasos.push({
      key: 'pago',
      title: 'Falta pagarlo para confirmarlo',
      when: null,
      tone: 'current',
    });
  }

  if (appointment.rescheduledAt) {
    pasos.push({
      key: 'reprogramado',
      title: paciente ? 'Lo reprogramaste' : 'Se reprogramó el turno',
      when: cuando(appointment.rescheduledAt),
      tone: 'done',
    });
  }

  if (status === 'CANCELADO') {
    pasos.push({
      key: 'fin',
      title: 'Se canceló el turno',
      when: cuando(appointment.cancelledAt),
      tone: 'bad',
    });
    if (reembolso) pasos.push({ key: 'reembolso', when: null, ...reembolso });
    return pasos;
  }
  if (status === 'LIBERADO') {
    pasos.push({
      key: 'fin',
      title: 'Se liberó el horario porque no se pagó a tiempo',
      when: null,
      tone: 'bad',
    });
    if (reembolso) pasos.push({ key: 'reembolso', when: null, ...reembolso });
    return pasos;
  }

  if (status !== 'RESERVADO_SIN_PAGAR') {
    pasos.push({ key: 'confirmado', title: 'Quedó confirmado', when: null, tone: 'done' });
  }

  const consulta = `${formatDate(appointment.date)} · ${appointment.startTime}`;
  if (status === 'COMPLETADO') {
    pasos.push({
      key: 'consulta',
      title: paciente ? 'Tuviste la consulta' : 'Se realizó la consulta',
      when: consulta,
      tone: 'done',
    });
  } else if (status === 'NO_ASISTIO') {
    pasos.push({
      key: 'consulta',
      title: 'No hubo conexión a la consulta',
      when: consulta,
      tone: 'bad',
    });
  } else if (isActive(appointment)) {
    const empezo = Date.parse(appointment.scheduledAt) <= now.getTime();
    pasos.push({
      key: 'consulta',
      title: empezo ? 'La consulta está en curso' : 'Consulta',
      when: empezo ? null : consulta,
      tone: empezo ? 'current' : 'pending',
    });
  }
  return pasos;
}
