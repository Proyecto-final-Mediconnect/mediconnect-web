import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError } from '../../../shared/api/apiError';
import type { ProfessionalStats } from '../types';

/** Resumen de actividad del profesional en el período (ENG-196). */
export async function getMyStats(from: string, to: string): Promise<ProfessionalStats> {
  const qs = new URLSearchParams({ from, to });
  const response = await apiFetch(`/professionals/me/stats?${qs.toString()}`);
  if (!response.ok) throw await toApiError(response, 'No pudimos cargar tu actividad.');
  return (await response.json()) as ProfessionalStats;
}
