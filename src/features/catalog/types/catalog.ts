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
