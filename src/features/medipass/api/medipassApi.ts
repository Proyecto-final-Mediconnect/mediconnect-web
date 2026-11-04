import { apiFetch } from '../../../shared/api/apiFetch';
import { apiError, toApiError } from '../../../shared/api/apiError';
import type {
  EmergencyCardCreated,
  EmergencyCardStatus,
  EmergencySession,
  EmergencySessionStatus,
  MediPassActiveAccess,
  MediPassCode,
  MediPassHistory,
  MediPassScope,
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
/**
 * El rechazo de una tarjeta (ENG-176). Igual que con el código, no distingue
 * "nunca existió" de "el paciente la desactivó".
 */
export const TARJETA_INVALIDA =
  'Esta tarjeta de emergencia no es válida o el paciente la desactivó.';

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
  if (!response.ok)
    throw await toApiError(response, 'No pudimos cortar el acceso. Probá de nuevo.');
}

/** `GET /medipass/me/scope`: qué bloques ve un consultante externo (ENG-149). */
export async function getMyScope(): Promise<MediPassScope> {
  const response = await apiFetch('/medipass/me/scope');
  if (!response.ok) throw await toApiError(response, 'No pudimos cargar qué se muestra.');
  return (await response.json()) as MediPassScope;
}

/** `PUT /medipass/me/scope`: cambia qué ve un consultante externo (ENG-149). */
export async function updateMyScope(scope: MediPassScope): Promise<MediPassScope> {
  const response = await apiFetch('/medipass/me/scope', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scope),
  });
  if (!response.ok)
    throw await toApiError(response, 'No pudimos guardar el cambio, probá de nuevo.');
  return (await response.json()) as MediPassScope;
}

/** `GET /medipass/me/emergency-card`: si hay una tarjeta activa (ENG-176). */
export async function getMyEmergencyCard(): Promise<EmergencyCardStatus> {
  const response = await apiFetch('/medipass/me/emergency-card');
  if (!response.ok) throw await toApiError(response, 'No pudimos cargar tu tarjeta de emergencia.');
  return (await response.json()) as EmergencyCardStatus;
}

/**
 * `POST /medipass/me/emergency-card`: genera la tarjeta, o una nueva que
 * reemplaza a la anterior (ENG-176). El token llega una sola vez.
 */
export async function createMyEmergencyCard(): Promise<EmergencyCardCreated> {
  const response = await apiFetch('/medipass/me/emergency-card', { method: 'POST' });
  if (!response.ok)
    throw await toApiError(response, 'No pudimos generar la tarjeta. Probá de nuevo.');
  return (await response.json()) as EmergencyCardCreated;
}

/** `DELETE /medipass/me/emergency-card`: la desactiva. Idempotente (ENG-176). */
export async function disableMyEmergencyCard(): Promise<void> {
  const response = await apiFetch('/medipass/me/emergency-card', { method: 'DELETE' });
  if (!response.ok)
    throw await toApiError(response, 'No pudimos desactivar la tarjeta. Probá de nuevo.');
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
 * el código o con la tarjeta (ENG-176). Cualquier rechazo da el mismo mensaje.
 */
export async function openEmergencySession(
  input: OpenEmergencySessionInput,
): Promise<EmergencySession> {
  const conTarjeta = input.tarjeta !== undefined;
  const body: OpenEmergencySessionInput = {
    // La tarjeta es base64url y distingue mayúsculas: va tal cual.
    ...(conTarjeta
      ? { tarjeta: input.tarjeta }
      : { codigo: (input.codigo ?? '').replace(/[\s-]/g, '').toUpperCase() }),
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
    throw apiError(response.status, conTarjeta ? TARJETA_INVALIDA : CODIGO_INVALIDO);
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
