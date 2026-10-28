import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getMyActiveAccesses,
  getMyMediPassCode,
  getMyMediPassHistory,
  getMyVitalBlock,
  revokeAccess,
} from '../api/medipassApi';

/**
 * El código vigente. Se vuelve a pedir justo cuando vence (ENG-72 lo rota cada
 * 5 minutos): el QR de la pantalla nunca muestra un código que ya no sirve.
 */
export function useMyMediPassCode() {
  return useQuery({
    queryKey: ['medipass', 'me'],
    queryFn: getMyMediPassCode,
    refetchInterval: (query) => {
      // Con el backend caído no se insiste cada segundo sobre algo que ya falla.
      if (query.state.status === 'error') return 30_000;
      const expira = query.state.data?.expiraEl;
      if (!expira) return false;
      const restante = new Date(expira).getTime() - Date.now();
      // Si llega un código ya vencido (reloj del dispositivo adelantado, o el
      // servidor devolvió el mismo un instante más), no se pide cada segundo
      // para siempre: se espera un poco y se vuelve a probar.
      return restante > 0 ? Math.max(5_000, restante + 500) : 15_000;
    },
    refetchOnWindowFocus: true,
  });
}

export function useMyVitalBlock() {
  return useQuery({ queryKey: ['medipass', 'me', 'vital'], queryFn: getMyVitalBlock });
}

/**
 * Historial de accesos (ENG-76), de a una página. Al cambiar de página se queda
 * la anterior a la vista hasta que llega la nueva, en vez de vaciar la lista.
 */
export function useMyMediPassHistory(pagina: number) {
  return useQuery({
    queryKey: ['medipass', 'me', 'historial', pagina],
    queryFn: () => getMyMediPassHistory(pagina),
    placeholderData: keepPreviousData,
  });
}

/**
 * Quién está mirando el MediPass ahora (ENG-74). Se refresca cada 30 segundos:
 * es "en tiempo real" en la medida en que importa, sin un socket abierto para
 * una lista de dos o tres filas.
 */
export function useMyActiveAccesses() {
  return useQuery({
    queryKey: ['medipass', 'me', 'accesses'],
    queryFn: getMyActiveAccesses,
    refetchInterval: 30_000,
  });
}

/** Corta un acceso (ENG-75) y actualiza la lista y el historial. */
export function useRevokeAccess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: revokeAccess,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['medipass', 'me', 'accesses'] }),
        queryClient.invalidateQueries({ queryKey: ['medipass', 'me', 'historial'] }),
      ]),
  });
}
