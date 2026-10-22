import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyNotifications, markNotificationRead } from '../api/notificationsApi';
import type { InAppInbox } from '../types/notification';

const INBOX_KEY = ['notifications', 'me'] as const;

/**
 * La bandeja de avisos. Se vuelve a pedir cada minuto y al volver a la pestaña:
 * un turno pagado tiene que aparecer en la campanita sin recargar la página.
 */
export function useMyNotifications(enabled = true) {
  return useQuery({
    queryKey: INBOX_KEY,
    queryFn: getMyNotifications,
    enabled,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });
}

/**
 * Marca un aviso como leído. Optimista: el contador baja al tocar, sin esperar
 * al servidor; si el pedido falla, vuelve a lo que había.
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: INBOX_KEY });
      const previous = queryClient.getQueryData<InAppInbox>(INBOX_KEY);
      if (previous) {
        const now = new Date().toISOString();
        let marked = 0;
        const notifications = previous.notifications.map((n) => {
          if (n.id !== id || n.readAt) return n;
          marked += 1;
          return { ...n, readAt: now };
        });
        queryClient.setQueryData<InAppInbox>(INBOX_KEY, {
          unreadCount: Math.max(0, previous.unreadCount - marked),
          notifications,
        });
      }
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(INBOX_KEY, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: INBOX_KEY }),
  });
}
