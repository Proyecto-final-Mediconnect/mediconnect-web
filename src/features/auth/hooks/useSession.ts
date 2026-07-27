import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMe, UnauthenticatedError } from '../api/getMe';
import { logout as logoutRequest } from '../api/logout';
import type { SessionUser } from '../types/session';

export const SESSION_QUERY_KEY = ['session'] as const;

/**
 * Sesión actual del usuario, hidratada desde `GET /me`. Devuelve `user: null`
 * cuando no hay sesión (401), sin tratarlo como error.
 */
export function useSession() {
  const query = useQuery<SessionUser | null>({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      try {
        return await getMe();
      } catch (err) {
        // Sin sesión no es un fallo: es un estado válido (deslogueado).
        if (err instanceof UnauthenticatedError) return null;
        throw err;
      }
    },
    // Un 401 no se reintenta; los errores de red sí, una vez.
    retry: (failureCount, err) =>
      !(err instanceof UnauthenticatedError) && failureCount < 1,
    staleTime: 5 * 60 * 1000,
  });

  return {
    user: query.data ?? null,
    isLoading: query.isPending,
    isAuthenticated: !!query.data,
  };
}

/** Cierra sesión y limpia la sesión cacheada. */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      queryClient.setQueryData(SESSION_QUERY_KEY, null);
      // Cualquier dato del usuario anterior deja de ser válido.
      void queryClient.invalidateQueries();
    },
  });
}
