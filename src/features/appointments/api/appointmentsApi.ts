import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError } from '../../../shared/api/apiError';
import type { Appointment, Availability, BookAppointmentPayload } from '../types/appointment';

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
 * Cancela un turno futuro propio (ENG-55). Devuelve el turno ya en `CANCELADO`.
 *
 * `PATCH` sin body: el turno no se borra, cambia de estado, y lo único que se
 * puede pedir es la cancelación. Mandar un cuerpo daría 400 — el backend corre
 * con `forbidNonWhitelisted`.
 */
export async function cancelAppointment(appointmentId: string): Promise<Appointment> {
  const response = await apiFetch(`/appointments/${appointmentId}/cancel`, {
    method: 'PATCH',
  });

  if (!response.ok) {
    throw await toApiError(response, 'No se pudo cancelar el turno.');
  }

  return (await response.json()) as Appointment;
}
