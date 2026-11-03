import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { logout as logoutRequest } from '../../auth/api/logout';
import { SESSION_QUERY_KEY } from '../../auth/hooks/useSession';
import { disconnectRealtime } from '../../chat/lib/realtime';
import {
  deleteMyAccount,
  downloadMyData,
  getPreferences,
  updatePreferences,
  type Preferences,
} from '../api/privacyApi';

const PREFERENCIAS_KEY = ['me', 'preferences'] as const;

export function useDownloadMyData() {
  return useMutation({ mutationFn: downloadMyData });
}

export function usePreferences(enabled = true) {
  return useQuery({ queryKey: PREFERENCIAS_KEY, queryFn: getPreferences, enabled });
}

/** Cambia la preferencia al instante y vuelve atrás si falla. */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updatePreferences,
    onMutate: async (nuevas: Preferences) => {
      await queryClient.cancelQueries({ queryKey: PREFERENCIAS_KEY });
      const anteriores = queryClient.getQueryData<Preferences>(PREFERENCIAS_KEY);
      queryClient.setQueryData(PREFERENCIAS_KEY, nuevas);
      return { anteriores };
    },
    onError: (_err, _nuevas, contexto) => {
      if (contexto?.anteriores) queryClient.setQueryData(PREFERENCIAS_KEY, contexto.anteriores);
    },
    onSuccess: (guardadas) => queryClient.setQueryData(PREFERENCIAS_KEY, guardadas),
  });
}

/**
 * Da de baja la cuenta y cierra la sesión acá. El logout del backend puede
 * fallar —el usuario ya está bloqueado en Supabase—, así que la sesión local se
 * limpia igual: lo que importa es que en este navegador no quede nada.
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMyAccount,
    onSuccess: async () => {
      try {
        await logoutRequest();
      } catch {
        // Ya no hay cuenta que cerrar del otro lado.
      }
      disconnectRealtime();
      queryClient.setQueryData(SESSION_QUERY_KEY, null);
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== SESSION_QUERY_KEY[0],
      });
    },
  });
}
