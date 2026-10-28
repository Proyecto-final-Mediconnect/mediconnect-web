import { apiFetch } from '../../../shared/api/apiFetch';
import { apiError, toApiError } from '../../../shared/api/apiError';
import type {
  EmergencySession,
  EmergencySessionStatus,
  MediPassActiveAccess,
  MediPassCode,
  MediPassHistory,
  OpenEmergencySessionInput,
  VitalBlock,
} from '../types/medipass';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

/**
 * Un solo mensaje para "no existe" y "venció": distinguirlos le diría a quien
 * prueba códigos cuáles existieron alguna vez.
 */
export const CODIGO_INVALIDO = 'Código inválido o vencido.';
export const DEMASIADOS_INTENTOS = 'Demasiados intentos. Esperá un minuto y probá de nuevo.';
export const SESION_VENCIDA =
  'El acceso venció. Pedile al paciente que te muestre el código de nuevo.';

/** `GET /medipass/me`: el código vigente del paciente logueado (ENG-72). */
export async function getMyMediPassCode(): Promise<MediPassCode> {
  const response = await apiFetch('/medipass/me');
  if (!response.ok) throw await toApiError(response, 'No pudimos cargar tu código MediPass.');
  return (await response.json()) as MediPassCode;
}

/** `GET /medipass/me/vital`: el bloque vital del paciente logueado (ENG-103). */
export async function getMyVitalBlock(): Promise<VitalBlock> {
  const response = await apiFetch('/medipass/me/vital');
  if (!response.ok) throw await toApiError(response, 'No pudimos cargar tu información vital.');
  return (await response.json()) as VitalBlock;
}

/** `GET /medipass/me/historial`: quién abrió el MediPass, cuándo y qué miró (ENG-76). */
export async function getMyMediPassHistory(pagina = 1): Promise<MediPassHistory> {
  const response = await apiFetch(`/medipass/me/historial?pagina=${pagina}`);
  if (!response.ok) throw await toApiError(response, 'No pudimos cargar el historial de accesos.');
  return (await response.json()) as MediPassHistory;
}

/** `GET /medipass/me/accesses`: quién está mirando el MediPass ahora (ENG-74). */
export async function getMyActiveAccesses(): Promise<MediPassActiveAccess[]> {
  const response = await apiFetch('/medipass/me/accesses');
  if (!response.ok)
    throw await toApiError(response, 'No pudimos cargar quién está mirando tu MediPass.');
  return (await response.json()) as MediPassActiveAccess[];
}

/**
 * `DELETE /medipass/me/accesses/:id`: corta un acceso (ENG-75). Es idempotente:
 * cortar uno que ya venció también da 204.
 */
export async function revokeAccess(id: string): Promise<void> {
  const response = await apiFetch(`/medipass/me/accesses/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw await toApiError(response, 'No pudimos cortar el acceso. Probá de nuevo.');
}

/** Fetch público: quien escanea no tiene cuenta, así que no hay sesión que renovar. */
async function publicFetch(path: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw apiError(0, 'No pudimos conectarnos. Revisá la conexión e intentá de nuevo.');
  }
}

/**
 * `POST /medipass/sessions` (público, ENG-73): abre el acceso de emergencia con
 * el código. Cualquier rechazo del código da el mismo mensaje.
 */
export async function openEmergencySession(
  input: OpenEmergencySessionInput,
): Promise<EmergencySession> {
  const body: OpenEmergencySessionInput = {
    codigo: input.codigo.replace(/[\s-]/g, '').toUpperCase(),
    nombre: input.nombre.trim(),
    ...(input.matricula?.trim() ? { matricula: input.matricula.trim() } : {}),
  };
  const response = await publicFetch('/medipass/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (response.status === 429) throw apiError(429, DEMASIADOS_INTENTOS);
  // Un 400 es de validación (el nombre o la matrícula): se muestra lo que dice
  // el backend. Decirle "código inválido" al médico lo haría pedirle otro código
  // al paciente sin motivo.
  if (response.status === 400) {
    throw await toApiError(response, 'Revisá los datos e intentá de nuevo.');
  }
  // El resto de los rechazos del código (no existe, venció, se revocó) dan el
  // mismo mensaje.
  if (response.status >= 400 && response.status < 500)
    throw apiError(response.status, CODIGO_INVALIDO);
  if (!response.ok)
    throw await toApiError(response, 'No pudimos abrir el MediPass. Intentá de nuevo.');
  return (await response.json()) as EmergencySession;
}

/** `GET /medipass/sessions/:id` (público, ENG-104): 410 si el acceso venció. */
export async function getEmergencySession(sesionId: string): Promise<EmergencySessionStatus> {
  const response = await publicFetch(`/medipass/sessions/${encodeURIComponent(sesionId)}`);

  if (response.status === 410 || response.status === 404) {
    throw apiError(410, SESION_VENCIDA);
  }
  if (!response.ok) throw await toApiError(response, 'No pudimos cargar el MediPass.');
  return (await response.json()) as EmergencySessionStatus;
}
