import type { Specialty } from '../types/professionalProfile';
import { apiError } from './apiError';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

/** Catálogo curado de especialidades para el selector del perfil (público). */
export async function getSpecialties(): Promise<Specialty[]> {
  const response = await fetch(`${API_BASE_URL}/specialties`);

  if (!response.ok) {
    throw apiError(response.status, 'No se pudieron cargar las especialidades.');
  }

  return (await response.json()) as Specialty[];
}
