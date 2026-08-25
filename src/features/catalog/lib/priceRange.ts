import type { CatalogFilters } from '../types/catalog';

export const PRICE_RANGE_ERROR = 'El precio máximo debe ser mayor o igual que el mínimo.';

/**
 * El backend responde 400 si maxPrice < minPrice. Se valida en el front para
 * cortar antes de pedirlo y mostrar el problema en el campo, en vez de un
 * error genérico de red.
 */
export function validatePriceRange(filters: CatalogFilters): string | undefined {
  if (!filters.minPrice || !filters.maxPrice) return undefined;

  const min = Number(filters.minPrice);
  const max = Number(filters.maxPrice);
  if (Number.isNaN(min) || Number.isNaN(max)) return undefined;

  return max < min ? PRICE_RANGE_ERROR : undefined;
}
