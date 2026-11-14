import type { CheckoutResult } from '../types/payment';

/**
 * MercadoPago en otra pestaña (ENG-199).
 *
 * La pestaña de MediConnect se queda esperando la confirmación y la de
 * MercadoPago, al volver, solo avisa y se cierra. Las dos se hablan por
 * `localStorage` (para que la vuelta sepa que la abrió MediConnect) y por
 * `BroadcastChannel` (para que la que espera pregunte enseguida).
 *
 * Todo es best effort: sin storage o sin `BroadcastChannel` el flujo sigue
 * funcionando, solo que la pestaña que espera se entera por el polling.
 */

const CANAL = 'mediconnect:pagos';
/** Pasado esto, una marca vieja no convierte una vuelta normal en "cerrá la pestaña". */
const MARCA_VALIDA_MS = 60 * 60_000;

const clave = (appointmentId: string) => `mediconnect:pago-en-pestana:${appointmentId}`;

/** Lo que la pestaña de vuelta le cuenta a la que espera. */
export interface VueltaDePago {
  appointmentId: string;
  resultado: CheckoutResult;
}

/**
 * Abre la pestaña **en el mismo click**, antes de tener el link: si se abriera
 * después de la respuesta del backend, el navegador la trataría como popup y la
 * bloquearía. `null` si igual la bloqueó.
 */
export function abrirPestanaDePago(): Window | null {
  const pestana = window.open('', '_blank');
  if (!pestana) return null;
  try {
    pestana.document.title = 'Abriendo MercadoPago…';
    pestana.document.body.textContent = 'Abriendo MercadoPago…';
    pestana.document.body.style.cssText =
      'font-family: system-ui, sans-serif; padding: 32px; color: #0b4f6c;';
  } catch {
    // Si no se puede escribir en la pestaña en blanco, igual se va a MercadoPago.
  }
  return pestana;
}

export function marcarPagoEnPestana(appointmentId: string): void {
  try {
    localStorage.setItem(clave(appointmentId), String(Date.now()));
  } catch {
    // Sin storage la vuelta se muestra como una vuelta normal.
  }
}

/** Si esta vuelta de MercadoPago es la de la pestaña que abrió MediConnect. */
export function esPestanaDePago(appointmentId: string, ahora = Date.now()): boolean {
  try {
    const marca = Number(localStorage.getItem(clave(appointmentId)));
    return Number.isFinite(marca) && marca > 0 && ahora - marca < MARCA_VALIDA_MS;
  } catch {
    return false;
  }
}

export function olvidarPagoEnPestana(appointmentId: string): void {
  try {
    localStorage.removeItem(clave(appointmentId));
  } catch {
    // Nada que hacer: la marca vence sola.
  }
}

export function avisarVuelta(vuelta: VueltaDePago): void {
  if (typeof BroadcastChannel === 'undefined') return;
  const canal = new BroadcastChannel(CANAL);
  canal.postMessage(vuelta);
  canal.close();
}

/** Escucha las vueltas de MercadoPago de otras pestañas. Devuelve cómo dejar de escuchar. */
export function escucharVueltas(alVolver: (vuelta: VueltaDePago) => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {};
  const canal = new BroadcastChannel(CANAL);
  canal.onmessage = (event: MessageEvent<VueltaDePago>) => alVolver(event.data);
  return () => canal.close();
}
