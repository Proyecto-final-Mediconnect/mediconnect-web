/**
 * Tipos del pago de un turno (EP-04, ENG-63).
 *
 * Espejan lo que devuelven `POST` y `GET /appointments/:id/payment`. **La
 * tarjeta nunca pasa por MediConnect**: el backend crea la preferencia y la web
 * manda al paciente al checkout de MercadoPago, que deja el PCI de su lado
 * (ADR-013). Por eso no hay ni va a haber tipos de tarjeta acá.
 */

/** Espeja el enum `payment_status` de la base. */
export type PaymentStatus = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'REEMBOLSADO';

/** Respuesta de `POST /appointments/:id/payment`: adónde mandar al paciente. */
export interface CheckoutLink {
  appointmentId: string;
  /** URL del Checkout Pro de MercadoPago. */
  checkoutUrl: string;
  /** `true` con credenciales de prueba: el cobro no es real. */
  sandbox: boolean;
  amount: number;
  currency: string;
  status: PaymentStatus;
}

/**
 * Respuesta de `GET /appointments/:id/payment`.
 *
 * `SIN_INICIAR` no es un estado de la base: el backend lo devuelve cuando
 * todavía no hay fila en `payments`, o sea, cuando nunca se pidió el link.
 */
export interface PaymentStatusView {
  appointmentId: string;
  status: PaymentStatus | 'SIN_INICIAR';
  appointmentStatus: string;
}

/**
 * Lo que dice el query param `resultado` con el que MercadoPago devuelve al
 * paciente (los `back_urls` de ENG-63). **Informa, no decide**: el turno lo
 * confirma el webhook de ENG-64, y la pantalla de vuelta lo lee del backend.
 */
export type CheckoutResult = 'exito' | 'pendiente' | 'fallo';
