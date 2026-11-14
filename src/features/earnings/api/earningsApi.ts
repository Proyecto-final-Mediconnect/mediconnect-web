import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError } from '../../../shared/api/apiError';
import type { EarningsFilters, EarningsView } from '../types';

function query(from: string, to: string, filtros: EarningsFilters, pagina?: number): string {
  const qs = new URLSearchParams({ from, to });
  if (pagina) qs.set('pagina', String(pagina));
  if (filtros.estado) qs.set('estado', filtros.estado);
  if (filtros.paciente) qs.set('paciente', filtros.paciente);
  if (filtros.orden && filtros.orden !== 'RECIENTES') qs.set('orden', filtros.orden);
  return qs.toString();
}

/** Cobros del profesional en el período, con los filtros (ENG-194). */
export async function getMyEarnings(
  from: string,
  to: string,
  pagina: number,
  filtros: EarningsFilters = {},
): Promise<EarningsView> {
  const response = await apiFetch(`/professionals/me/earnings?${query(from, to, filtros, pagina)}`);
  if (!response.ok) throw await toApiError(response, 'No pudimos cargar tus cobros.');
  return (await response.json()) as EarningsView;
}

/** El CSV de lo que se ve en la tabla (mismo período y filtros), para descargar. */
export async function downloadEarningsCsv(
  from: string,
  to: string,
  filtros: EarningsFilters = {},
): Promise<Blob> {
  const response = await apiFetch(`/professionals/me/earnings/export?${query(from, to, filtros)}`);
  if (!response.ok) throw await toApiError(response, 'No pudimos generar el CSV.');
  return response.blob();
}
