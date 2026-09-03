import type { ProfessionalCard } from '../types/catalog';
import { mockDetailsFor } from './mockProfessionalDetails';

/**
 * Filtros que el backend todavía no soporta.
 *
 * `GET /catalog/professionals` acepta `specialtyId`, `minPrice` y `maxPrice`, y
 * nada más. El diseño ofrece además búsqueda por texto, disponibilidad y
 * calificación mínima.
 *
 * Se resuelven **sobre los resultados ya cargados**, en el cliente. Es una
 * limitación real y conviene tenerla clara: con scroll infinito solo se filtra
 * lo que se trajo hasta ahora, no el catálogo entero. Con pocos profesionales no
 * se nota; cuando el catálogo crezca, esto tiene que pasar al backend.
 *
 * La alternativa era dibujar los controles sin conectarlos. Un buscador donde
 * escribís y no pasa nada es peor que no tenerlo, así que filtran de verdad —
 * contra los datos que hay, incluidos los inventados de
 * `mockProfessionalDetails`.
 */

export type LocalCatalogFilters = {
  /** Texto libre: nombre o especialidad. */
  query: string;
  /** Máximo de días hasta el próximo turno. `null` = sin límite. */
  withinDays: number | null;
  /** Calificación mínima. `null` = sin mínimo. */
  minRating: number | null;
};

export const EMPTY_LOCAL_FILTERS: LocalCatalogFilters = {
  query: '',
  withinDays: null,
  minRating: null,
};

export function hasLocalFilters(filters: LocalCatalogFilters): boolean {
  return filters.query.trim() !== '' || filters.withinDays !== null || filters.minRating !== null;
}

/** Sin acentos y en minúsculas, para que "pediatria" encuentre "Pediatría". */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function applyLocalFilters(
  professionals: ProfessionalCard[],
  filters: LocalCatalogFilters,
): ProfessionalCard[] {
  if (!hasLocalFilters(filters)) return professionals;

  const needle = normalize(filters.query.trim());

  return professionals.filter((professional) => {
    if (needle !== '') {
      const haystack = normalize(
        [
          professional.firstName,
          professional.lastName,
          ...professional.specialties.map((s) => s.name),
        ].join(' '),
      );
      if (!haystack.includes(needle)) return false;
    }

    if (filters.withinDays !== null || filters.minRating !== null) {
      const mock = mockDetailsFor(professional);
      if (filters.withinDays !== null && mock.nextSlotInDays > filters.withinDays) return false;
      if (filters.minRating !== null && mock.rating < filters.minRating) return false;
    }

    return true;
  });
}
