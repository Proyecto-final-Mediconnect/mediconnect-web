import { useQuery } from '@tanstack/react-query';
import { getSpecialties } from '../api/getSpecialties';

/** El catálogo curado cambia por PR, no por request: se cachea agresivamente. */
export function useSpecialties() {
  return useQuery({
    queryKey: ['catalog', 'specialties'],
    queryFn: getSpecialties,
    staleTime: 60 * 60 * 1000,
  });
}
