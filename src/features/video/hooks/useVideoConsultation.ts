import { useCallback, useEffect, useRef, useState } from 'react';
import { joinVideoConsultation } from '../api/videoApi';
import type { VideoConsultationAccess } from '../types/dailyRoom';

/**
 * Entrar a la videoconsulta de un turno (ENG-56).
 *
 * **La primera llamada crea la sala en Daily**, que se factura por minuto de
 * participante. Todo lo de acá abajo existe para que abrir la pantalla la pida
 * exactamente una vez.
 *
 * Se maneja con una promesa propia y no con react-query. Como query, react-query
 * la reintentaría sola, la reejecutaría al volver el foco a la pestaña y la
 * cachearía — y lo que devuelve es una URL con una credencial de acceso a una
 * consulta médica, que no tiene por qué quedar guardada en el cache del cliente.
 * Como mutación tampoco servía: en StrictMode React monta, desmonta y vuelve a
 * montar en desarrollo; ese desmonte desengancha el observer de la mutación, el
 * remonte arranca en `idle` y el guard que asegura una sola sala impedía volver
 * a pedirla. Resultado: **la pantalla se quedaba clavada en "Abriendo la sala…"
 * y la videoconsulta no se podía ver en local**, aunque el POST hubiera salido.
 *
 * La promesa memoizada en un ref no tiene ese problema: sobrevive al ciclo de
 * StrictMode porque el ref es del componente, no del observer, y cada montaje se
 * vuelve a colgar del MISMO pedido en vez de hacer uno nuevo.
 */

export type AccesoVideoconsulta =
  | { fase: 'CARGANDO' }
  | { fase: 'LISTO'; access: VideoConsultationAccess }
  | { fase: 'ERROR'; error: Error };

/**
 * @param habilitado Si ya se puede pedir la sala. En `false` no se llama a nada:
 *   es lo que deja esperar en la sala de espera sin generar un 409 por turno ni
 *   intentar crear una sala en Daily antes de tiempo.
 */
export function useVideoConsultationAccess(appointmentId: string, habilitado = true) {
  /** El pedido en vuelo. Mientras esté acá, no se hace otro. */
  const pedido = useRef<Promise<VideoConsultationAccess> | null>(null);
  const [estado, setEstado] = useState<AccesoVideoconsulta>({ fase: 'CARGANDO' });
  /** Sube al reintentar: es lo que vuelve a disparar el efecto. */
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!habilitado) return;

    let vivo = true;

    pedido.current ??= joinVideoConsultation(appointmentId);
    pedido.current.then(
      (access) => {
        if (vivo) setEstado({ fase: 'LISTO', access });
      },
      (error: Error) => {
        if (vivo) setEstado({ fase: 'ERROR', error });
      },
    );

    // Sin esto, salir de la pantalla mientras la sala se abre dejaría un
    // setState apuntando a un componente ya desmontado.
    return () => {
      vivo = false;
    };
  }, [appointmentId, intento, habilitado]);

  const reintentar = useCallback(() => {
    pedido.current = null;
    setEstado({ fase: 'CARGANDO' });
    setIntento((n) => n + 1);
  }, []);

  return { estado, reintentar };
}
