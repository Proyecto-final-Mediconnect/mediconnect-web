import { apiRequest } from '../../../shared/lib/httpClient';
import type { CatalogFilters, ProfessionalsPage } from '../types/catalog';

/** Tamaño de página del catálogo (ENG-49: 20 por página). */
export const PAGE_SIZE = 20;

/**
 * Arma el query string del catálogo. Los filtros vacíos NO se mandan: el
 * backend rechaza `minPrice=` con 400 (no es un número), y omitirlos es lo
 * que significa "sin filtro".
 */
export function buildCatalogQuery(filters: CatalogFilters, page: number): string {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(PAGE_SIZE),
  });

  if (filters.specialtyId) params.set('specialtyId', filters.specialtyId);
  if (filters.minPrice.trim()) params.set('minPrice', filters.minPrice.trim());
  if (filters.maxPrice.trim()) params.set('maxPrice', filters.maxPrice.trim());

  return params.toString();
}

export function listProfessionals(
  filters: CatalogFilters,
  page: number,
): Promise<ProfessionalsPage> {
  return apiRequest<ProfessionalsPage>(
    `/catalog/professionals?${buildCatalogQuery(filters, page)}`,
    {
      fallbackMessage: 'No pudimos cargar el catálogo. Intentá de nuevo.',
    },
  );
}
