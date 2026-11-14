import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError } from '../../../shared/api/apiError';
import type { MyPatientsView } from '../types';

function query(q: string, pagina?: number): string {
  const qs = new URLSearchParams();
  if (q) qs.set('q', q);
  if (pagina) qs.set('pagina', String(pagina));
  const texto = qs.toString();
  return texto ? `?${texto}` : '';
}

/** Los pacientes del profesional, con la búsqueda (ENG-197). */
export async function getMyPatients(q: string, pagina: number): Promise<MyPatientsView> {
  const response = await apiFetch(`/professionals/me/patients${query(q, pagina)}`);
  if (!response.ok) throw await toApiError(response, 'No pudimos cargar tus pacientes.');
  return (await response.json()) as MyPatientsView;
}

/** El CSV de lo que se ve en la tabla (misma búsqueda, todas las páginas). */
export async function downloadMyPatientsCsv(q: string): Promise<Blob> {
  const response = await apiFetch(`/professionals/me/patients/export${query(q)}`);
  if (!response.ok) throw await toApiError(response, 'No pudimos generar el CSV.');
  return response.blob();
}
