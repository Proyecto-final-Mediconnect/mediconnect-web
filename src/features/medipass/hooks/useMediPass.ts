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
