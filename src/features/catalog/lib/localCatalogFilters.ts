import type { ProfessionalCard } from '../types/catalog';

/**
 * Filtros que el backend todavía no soporta.
 *
 * `GET /catalog/professionals` acepta `specialtyId`, `minPrice` y `maxPrice`, y
 * nada más. La búsqueda por texto del diseño se resuelve **sobre los resultados
 * ya cargados**, en el cliente. Es una limitación real y conviene tenerla clara:
 * con scroll infinito solo se filtra lo que se trajo hasta ahora, no el catálogo
 * entero. Con pocos profesionales no se nota; cuando el catálogo crezca, esto
 * tiene que pasar al backend.
 *
 * Antes había también "disponibilidad" y "calificación mínima", pero filtraban
 * sobre valores inventados (ENG-150): un filtro que descarta profesionales por
 * un número que no existe es peor que no tener el filtro. Vuelven cuando la API
 * sirva esos datos —la calificación es ENG-80/ENG-82—, y entonces conviene que
 * los resuelva el backend y no este archivo.
 */

export type LocalCatalogFilters = {
  /** Texto libre: nombre o especialidad. */
  query: string;
};

export const EMPTY_LOCAL_FILTERS: LocalCatalogFilters = {
  query: '',
};

export function hasLocalFilters(filters: LocalCatalogFilters): boolean {
  return filters.query.trim() !== '';
}

/** Sin acentos y en minúsculas, para que "pediatria" encuentre "Pediatría". */
function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function applyLocalFilters(
  professionals: ProfessionalCard[],
  filters: LocalCatalogFilters,
): ProfessionalCard[] {
  if (!hasLocalFilters(filters)) return professionals;

  const needle = normalize(filters.query.trim());

  return professionals.filter((professional) =>
    normalize(
      [
        professional.firstName,
        professional.lastName,
        ...professional.specialties.map((s) => s.name),
      ].join(' '),
    ).includes(needle),
  );
}
