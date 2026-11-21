import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError } from '../../../shared/api/apiError';
import type {
  Appointment,
  Availability,
  BookAppointmentPayload,
  CancellationRefund,
  CancelledAppointment,
} from '../types/appointment';

/** Grilla de horarios de un profesional entre dos fechas (ambas inclusive). */
export async function getAvailability(
  professionalId: string,
  from: string,
  to: string,
): Promise<Availability> {
  const query = new URLSearchParams({ from, to });
  const response = await apiFetch(
    `/professionals/${professionalId}/availability?${query.toString()}`,
  );

  if (!response.ok) {
    throw await toApiError(response, 'No se pudo cargar la disponibilidad.');
  }

  return (await response.json()) as Availability;
}

/**
 * Reserva un turno.
 *
 * Se manda solo `professionalId`, `date` y `startTime`. El precio, la duración y
 * el estado los decide el servidor, y el backend corre con
 * `forbidNonWhitelisted`: mandar cualquiera de ellos haría fallar el request
 * entero con un 400.
 */
export async function bookAppointment(payload: BookAppointmentPayload): Promise<Appointment> {
  const response = await apiFetch('/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await toApiError(response, 'No se pudo reservar el turno.');
  }

  return (await response.json()) as Appointment;
}

/** Turnos del usuario autenticado, del más próximo al más lejano. */
export async function getMyAppointments(): Promise<Appointment[]> {
  const response = await apiFetch('/appointments/me');

  if (!response.ok) {
    throw await toApiError(response, 'No se pudieron cargar tus turnos.');
  }

  return (await response.json()) as Appointment[];
}

/**
 * Cancela un turno futuro propio (ENG-55). Devuelve el turno ya en `CANCELADO`
 * y, desde ENG-65, lo que se devolvió.
 *
 * `PATCH` sin body: el turno no se borra, cambia de estado, y lo único que se
 * puede pedir es la cancelación. Mandar un cuerpo daría 400 — el backend corre
 * con `forbidNonWhitelisted`.
 */
export async function cancelAppointment(appointmentId: string): Promise<CancelledAppointment> {
  const response = await apiFetch(`/appointments/${appointmentId}/cancel`, {
    method: 'PATCH',
  });

  if (!response.ok) {
    throw await toApiError(response, 'No se pudo cancelar el turno.');
  }

  return (await response.json()) as CancelledAppointment;
}

/**
 * Mueve un turno propio a otro horario del mismo profesional (ENG-66). Es el
 * mismo turno: el pago sigue atado a él y no se vuelve a cobrar. Las reglas
 * (una sola vez, la política de cancelación si está pagado) las aplica el
 * backend, y su mensaje se muestra tal cual.
 */
export async function rescheduleAppointment({
  appointmentId,
  date,
  startTime,
}: {
  appointmentId: string;
  date: string;
  startTime: string;
}): Promise<Appointment> {
  const response = await apiFetch(`/appointments/${appointmentId}/reschedule`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, startTime }),
  });

  if (!response.ok) {
    throw await toApiError(response, 'No se pudo reprogramar el turno.');
  }

  return (await response.json()) as Appointment;
}

/**
 * Cuánto se devolvería si se cancela ahora (ENG-65), con la política que quedó
 * guardada en el turno al reservarlo. No cancela nada.
 */
export async function getCancellationQuote(appointmentId: string): Promise<CancellationRefund> {
  const response = await apiFetch(`/appointments/${appointmentId}/cancellation-quote`);

  if (!response.ok) {
    throw await toApiError(response, 'No pudimos calcular la devolución.');
  }

  return (await response.json()) as CancellationRefund;
}

/** Lo que devuelve la cancelación del profesional (ENG-204). */
export interface ProfessionalCancellation {
  id: string;
  /** `A_REPROGRAMAR` si estaba pagado; `CANCELADO` si era una reserva sin pagar. */
  status: 'A_REPROGRAMAR' | 'CANCELADO';
  cancelledBy: 'PROFESIONAL';
  reprogramDeadline: string | null;
}

/**
 * El profesional cancela un turno futuro, con un motivo obligatorio (ENG-204,
 * ADR-018). El paciente elige después otro horario o el reembolso del 100 %.
 */
export async function cancelAppointmentAsProfessional({
  appointmentId,
  reason,
}: {
  appointmentId: string;
  reason: string;
}): Promise<ProfessionalCancellation> {
  const response = await apiFetch(
    `/appointments/${encodeURIComponent(appointmentId)}/cancel-by-professional`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    },
  );

  if (!response.ok) {
    throw await toApiError(response, 'No se pudo cancelar el turno.');
  }

  return (await response.json()) as ProfessionalCancellation;
}

/** Lo que devuelve pedir el reembolso total: el turno y qué pasó con la plata. */
export interface FullRefundResult {
  id: string;
  status: 'CANCELADO';
  refund: CancellationRefund;
}

/**
 * El paciente elige el reembolso del 100 % de un turno que el profesional
 * canceló (ENG-204). El turno queda cancelado.
 */
export async function requestFullRefund(appointmentId: string): Promise<FullRefundResult> {
  const response = await apiFetch(
    `/appointments/${encodeURIComponent(appointmentId)}/full-refund`,
    { method: 'PATCH' },
  );

  if (!response.ok) {
    throw await toApiError(response, 'No se pudo pedir el reembolso.');
  }

  return (await response.json()) as FullRefundResult;
}

/** Estado de un turno recién cerrado por el profesional (ENG-189). */
export type ClosedAppointment = { id: string; status: 'COMPLETADO' | 'NO_ASISTIO' };

/**
 * El profesional finaliza la consulta (ENG-189): el turno queda `COMPLETADO` y
 * el paciente ya puede reseñarlo. Idempotente, así que reintentar tras un error
 * de red no duplica nada.
 */
export async function completeAppointment(appointmentId: string): Promise<ClosedAppointment> {
  const response = await apiFetch(`/appointments/${encodeURIComponent(appointmentId)}/complete`, {
    method: 'PATCH',
  });

  if (!response.ok) {
    throw await toApiError(response, 'No se pudo cerrar la consulta.');
  }

  return (await response.json()) as ClosedAppointment;
}

/**
 * El profesional marca que el paciente no se presentó (ENG-189). No reembolsa.
 */
export async function markAppointmentNoShow(appointmentId: string): Promise<ClosedAppointment> {
  const response = await apiFetch(`/appointments/${encodeURIComponent(appointmentId)}/no-show`, {
    method: 'PATCH',
  });

  if (!response.ok) {
    throw await toApiError(response, 'No se pudo marcar el turno.');
  }

  return (await response.json()) as ClosedAppointment;
}
