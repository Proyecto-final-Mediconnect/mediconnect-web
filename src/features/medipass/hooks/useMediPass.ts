import { useQuery } from '@tanstack/react-query';
import { getMyMediPassCode, getMyVitalBlock } from '../api/medipassApi';

/**
 * El código vigente. Se vuelve a pedir justo cuando vence (ENG-72 lo rota cada
 * 5 minutos): el QR de la pantalla nunca muestra un código que ya no sirve.
 */
export function useMyMediPassCode() {
  return useQuery({
    queryKey: ['medipass', 'me'],
    queryFn: getMyMediPassCode,
    refetchInterval: (query) => {
      const expira = query.state.data?.expiraEl;
      if (!expira) return false;
      return Math.max(1000, new Date(expira).getTime() - Date.now() + 500);
    },
    refetchOnWindowFocus: true,
  });
}

export function useMyVitalBlock() {
  return useQuery({ queryKey: ['medipass', 'me', 'vital'], queryFn: getMyVitalBlock });
}
