import { apiRequest } from '../../../shared/lib/httpClient';
import type { Specialty } from '../types/catalog';

/**
 * Fuente única del catálogo curado: el mismo endpoint que usa el formulario
 * de perfil profesional (ENG-48). El catálogo público no expone uno propio.
 */
export function getSpecialties(): Promise<Specialty[]> {
  return apiRequest<Specialty[]>('/specialties', {
    fallbackMessage: 'No pudimos cargar las especialidades.',
  });
}
