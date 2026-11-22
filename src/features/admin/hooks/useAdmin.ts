import { useQuery } from '@tanstack/react-query';
import { getAdminProfile } from '../api/adminApi';

/** El administrador que entra al panel (ENG-240). */
export function useAdminProfile() {
  return useQuery({
    queryKey: ['admin', 'me'],
    queryFn: getAdminProfile,
    retry: false,
  });
}
