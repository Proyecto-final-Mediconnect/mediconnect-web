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
  specialtyId: string;
  minPrice: string;
  maxPrice: string;
};

export const EMPTY_FILTERS: CatalogFilters = {
  specialtyId: '',
  minPrice: '',
  maxPrice: '',
};
