import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError } from '../../../shared/api/apiError';
import type {
  AffectedAppointment,
  CreateBlockPayload,
  CreatedBlock,
  SaveSchedulePayload,
  Schedule,
} from '../types/schedule';

const BASE = '/professionals/me/schedule';

/** Agenda del profesional autenticado: franjas semanales + bloqueos vigentes. */
export async function getMySchedule(): Promise<Schedule> {
  const response = await apiFetch(BASE);

  if (!response.ok) {
    throw await toApiError(response, 'No se pudo cargar tu agenda.');
  }

  return (await response.json()) as Schedule;
}

/**
 * Reemplaza la agenda semanal completa. Se mandan solo los campos del DTO: el
 * backend corre con `forbidNonWhitelisted`, así que un `id` de más haría fallar
 * el request entero con un 400.
 */
export async function saveMySchedule(payload: SaveSchedulePayload): Promise<Schedule> {
  const response = await apiFetch(BASE, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await toApiError(response, 'No se pudo guardar tu agenda.');
  }

  return (await response.json()) as Schedule;
}

/**
 * Qué turnos pisaría un bloqueo, sin crearlo (ENG-206). Es lo que se le muestra
 * al profesional antes de confirmar.
 */
export async function previewBlock(
  payload: CreateBlockPayload,
): Promise<{ affected: AffectedAppointment[] }> {
  const response = await apiFetch(`${BASE}/blocks/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await toApiError(response, 'No pudimos revisar tus turnos de ese horario.');
  }

  return (await response.json()) as { affected: AffectedAppointment[] };
}

/**
 * Crea el bloqueo. Con turnos tomados el backend exige `cancelAffected` y
 * `cancellationReason`; sin eso responde 409 con la lista (ENG-206).
 */
export async function createBlock(payload: CreateBlockPayload): Promise<CreatedBlock> {
  const response = await apiFetch(`${BASE}/blocks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await toApiError(response, 'No se pudo guardar el bloqueo.');
  }

  return (await response.json()) as CreatedBlock;
}

export async function deleteBlock(blockId: string): Promise<void> {
  const response = await apiFetch(`${BASE}/blocks/${blockId}`, {
    method: 'DELETE',
  });

  // 204 sin cuerpo: no se intenta parsear la respuesta exitosa.
  if (!response.ok) {
    throw await toApiError(response, 'No se pudo borrar el bloqueo.');
  }
}
