import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError } from '../../../shared/api/apiError';
import type { MyPatientsFilters, MyPatientsView } from '../types';

function query(filtros: MyPatientsFilters, pagina?: number): string {
  const qs = new URLSearchParams();
  if (filtros.q) qs.set('q', filtros.q);
  if (pagina) qs.set('pagina', String(pagina));
  qs.set('orden', filtros.orden);
  qs.set('dir', filtros.dir);
  if (filtros.proximo) qs.set('proximo', filtros.proximo);
  if (filtros.ultima) qs.set('ultima', filtros.ultima);
  return `?${qs.toString()}`;
}

/** Los pacientes del profesional, con búsqueda, filtros y orden (ENG-197). */
export async function getMyPatients(
  filtros: MyPatientsFilters,
  pagina: number,
): Promise<MyPatientsView> {
  const response = await apiFetch(`/professionals/me/patients${query(filtros, pagina)}`);
  if (!response.ok) throw await toApiError(response, 'No pudimos cargar tus pacientes.');
  return (await response.json()) as MyPatientsView;
}

/** El Excel de lo que se ve en la tabla: mismos filtros y orden, todas las páginas. */
export async function downloadMyPatientsXlsx(filtros: MyPatientsFilters): Promise<Blob> {
  const response = await apiFetch(`/professionals/me/patients/export${query(filtros)}`);
  if (!response.ok) throw await toApiError(response, 'No pudimos generar el Excel.');
  return response.blob();
}
