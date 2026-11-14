import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getMyPatients } from '../api/myPatientsApi';

/** Pacientes de la búsqueda y página elegidas. Mantiene la vista anterior mientras carga la otra. */
export function useMyPatients(q: string, pagina: number) {
  return useQuery({
    queryKey: ['my-patients', q, pagina] as const,
    queryFn: () => getMyPatients(q, pagina),
    placeholderData: keepPreviousData,
  });
}
