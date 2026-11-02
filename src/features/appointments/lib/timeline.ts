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
function cuando(iso: string | null | undefined): string | null {
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
 * En qué quedó el reembolso de un turno que se cayó (ENG-174), dicho desde quien
 * mira. `null` si no hubo reembolso. Lo usan la línea de tiempo y "Mis turnos".
 */
export function refundStep(
  appointment: Appointment,
  viewer: TimelineViewer = 'PACIENTE',
): { title: string; tone: StepTone } | null {
  const refund = appointment.refundState;
  if (!refund) return null;
  const monto = formatPrice(refund.amount, appointment.currency);
  const paciente = viewer === 'PACIENTE';
  switch (refund.status) {
    case 'PENDIENTE':
      return {
        title: paciente ? `Pedimos el reembolso de ${monto}` : `Reembolso de ${monto} en curso`,
        tone: 'current',
      };
    case 'PROCESADO':
      return {
        title: paciente ? `Te devolvimos ${monto}` : `Se le devolvieron ${monto} al paciente`,
        tone: 'done',
      };
    case 'RECHAZADO':
      return { title: `No se pudo hacer el reembolso de ${monto}`, tone: 'bad' };
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
  const reembolso = refundStep(appointment, viewer);
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
