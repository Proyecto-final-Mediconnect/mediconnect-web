import { apiFetch } from '../../shared/api/apiFetch';
import { toApiError } from '../../shared/api/apiError';

/** Espeja `GET /patients/me/summary` (ENG-198). */
export interface PatientSummary {
  from: string;
  to: string;
  currency: string;
  consultas: { realizadas: number; profesionales: number };
  pagos: { pagado: number; reembolsado: number; neto: number };
  accesos: { medipass: number; historiaClinica: number; total: number };
}

export async function getMySummary(from: string, to: string): Promise<PatientSummary> {
  const response = await apiFetch(`/patients/me/summary?${new URLSearchParams({ from, to })}`);
  if (!response.ok) throw await toApiError(response, 'No pudimos cargar tu resumen.');
  return (await response.json()) as PatientSummary;
}
