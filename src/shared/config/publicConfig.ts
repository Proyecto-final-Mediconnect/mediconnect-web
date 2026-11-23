import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/apiFetch';
import { toApiError } from '../api/apiError';

/**
 * Las reglas de negocio tal como las aplica el backend (`GET /config`, ENG-229).
 *
 * Antes la web las tenía copiadas ("espeja el backend; si cambia una, cambia la
 * otra"). Ahora las lee de acá. Los plazos de un turno puntual no salen de acá:
 * vienen en el turno (`paymentDueAt`, `joinOpensAt`…). Esto es para lo que se
 * muestra antes de que exista el turno o el código.
 */
export interface PublicConfig {
  currency: string;
  legalVersion: string;
  booking: { horizonDays: number; paymentWindowMinutes: number };
  videoConsultation: { opensMinutesBefore: number; graceMinutesAfter: number };
  appointments: { manualCloseHoursAfter: number };
  medipass: { codeMinutes: number; sessionMinutes: number };
  cancellationPolicy: {
    maxHours: number;
    maxFullRefundHours: number;
    minPartialRefundPercent: number;
  };
}

export const PUBLIC_CONFIG_KEY = ['public-config'] as const;

export async function getPublicConfig(): Promise<PublicConfig> {
  const response = await apiFetch('/config', {}, { refreshOn401: false });
  if (!response.ok) {
    throw await toApiError(response, 'No pudimos cargar la configuración.');
  }
  return (await response.json()) as PublicConfig;
}

/**
 * La configuración, o `undefined` mientras carga (o si falló: se reintenta sola).
 * Cambia solo con un deploy del backend, así que se pide una vez por sesión.
 */
export function usePublicConfig(): PublicConfig | undefined {
  return useQuery({
    queryKey: PUBLIC_CONFIG_KEY,
    queryFn: getPublicConfig,
    staleTime: 5 * 60_000,
    gcTime: Infinity,
  }).data;
}
