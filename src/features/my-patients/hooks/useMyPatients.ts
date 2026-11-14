import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getMyPatients } from '../api/myPatientsApi';
import type { MyPatientsFilters } from '../types';

/** Pacientes de los filtros y la página elegidos. Mantiene la vista anterior mientras carga la otra. */
export function useMyPatients(filtros: MyPatientsFilters, pagina: number) {
  return useQuery({
    queryKey: ['my-patients', filtros, pagina] as const,
    queryFn: () => getMyPatients(filtros, pagina),
    placeholderData: keepPreviousData,
  });
}
