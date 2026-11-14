import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError } from '../../../shared/api/apiError';
import type { EarningsView } from '../types';

const query = (from: string, to: string, pagina?: number) =>
  new URLSearchParams({ from, to, ...(pagina ? { pagina: String(pagina) } : {}) }).toString();

/** Cobros del profesional en el período (ENG-194). */
export async function getMyEarnings(
  from: string,
  to: string,
  pagina: number,
): Promise<EarningsView> {
  const response = await apiFetch(`/professionals/me/earnings?${query(from, to, pagina)}`);
  if (!response.ok) throw await toApiError(response, 'No pudimos cargar tus cobros.');
  return (await response.json()) as EarningsView;
}

/** El CSV del período, para descargar. */
export async function downloadEarningsCsv(from: string, to: string): Promise<Blob> {
  const response = await apiFetch(`/professionals/me/earnings/export?${query(from, to)}`);
  if (!response.ok) throw await toApiError(response, 'No pudimos generar el CSV.');
  return response.blob();
}
