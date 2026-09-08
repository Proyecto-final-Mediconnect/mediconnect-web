export type Specialty = {
  id: string;
  name: string;
};

/** Tarjeta del catálogo tal como la devuelve GET /catalog/professionals. */
export type ProfessionalCard = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  /** `null` si el profesional todavía no tiene especialidad asignada. */
  primarySpecialty: Specialty | null;
  specialties: Specialty[];
  /** `null` si no cargó su precio de consulta. */
  price: number | null;
  currency: string;
};

/** Un título del profesional, tal como se expone en el perfil público. */
export type Education = {
  id: string;
  institution: string;
  degree: string;
  /** `null` cuando el profesional no cargó el año del título. */
  year: number | null;
};

/**
 * Perfil público de UN profesional (ENG-50), tal como lo devuelve
 * `GET /professionals/:id`. Es un contrato más amplio que `ProfessionalCard`:
 * suma `bio` y `education`, que el listado no trae.
 *
 * No incluye matrícula, estado de validación ni datos de cobro — el backend los
 * deja fuera del `select` a propósito.
 */
export type PublicProfessionalProfile = {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  bio: string | null;
  specialties: Specialty[];
  education: Education[];
  /** `null` si no cargó su precio de consulta. */
  price: number | null;
  currency: string;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
};

export type ProfessionalsPage = {
  data: ProfessionalCard[];
  meta: PaginationMeta;
};

/** Filtros que el usuario controla desde la UI. */
export type CatalogFilters = {
  /**
   * Especialidades tildadas. Vacío = sin filtro (el catálogo completo), que no
   * es lo mismo que "ninguna especialidad".
   *
   * El orden es el de la lista de especialidades, no el de tildado: así el
   * mismo conjunto de filtros produce siempre la misma queryKey de React Query
   * y el mismo query string, y no se pierde la caché por haber tildado en otro
   * orden.
   */
  specialtyIds: string[];
  minPrice: string;
  maxPrice: string;
};

export const EMPTY_FILTERS: CatalogFilters = {
  specialtyIds: [],
  minPrice: '',
  maxPrice: '',
};

/** `true` si hay al menos un filtro puesto. */
export function hasAnyFilter(filters: CatalogFilters): boolean {
  return filters.specialtyIds.length > 0 || filters.minPrice !== '' || filters.maxPrice !== '';
}
