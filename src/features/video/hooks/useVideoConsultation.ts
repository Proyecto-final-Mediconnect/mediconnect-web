import { useMutation } from '@tanstack/react-query';
import { joinVideoConsultation } from '../api/videoApi';

/**
 * Entrar a la videoconsulta de un turno (ENG-56).
 *
 * Es una **mutación** y no una query, aunque la pantalla la dispare al montarse:
 * la primera llamada crea la sala en Daily. Como query, react-query la
 * reintentaría sola, la reejecutaría al volver el foco a la pestaña y la
 * cachearía — y lo que devuelve es una URL con una credencial de acceso a una
 * consulta médica, que no tiene por qué quedar guardada en el cache del cliente.
 *
 * Sin reintento automático por el mismo motivo: los errores de este endpoint son
 * de negocio (todavía no es la hora, el turno se canceló) y reintentarlos crea
 * salas, que cuestan minutos facturables.
 */
export function useJoinVideoConsultation() {
  return useMutation({
    mutationFn: joinVideoConsultation,
    retry: false,
    gcTime: 0,
  });
}
