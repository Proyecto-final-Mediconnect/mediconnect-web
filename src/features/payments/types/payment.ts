/**
 * Tipos del pago de un turno (EP-04, ENG-63).
 *
 * **Todavía no hay endpoints de pago.** El modelo `Payment` ya está en el schema
 * de Prisma (con `mercadopago_preference_id`, `mercadopago_payment_id`, monto,
 * moneda y estado), pero no existe el módulo que lo exponga. Estos tipos espejan
 * ese modelo para que, cuando ENG-63 lo implemente, la pantalla ya esté hablando
 * el mismo idioma y solo haya que reemplazar la simulación por el `fetch`.
 */

/** Espeja el enum `payment_status` de la base. */
export type PaymentStatus = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'REEMBOLSADO';

/** Espeja el modelo `Payment`. `method` lo informa MercadoPago al confirmar. */
export interface Payment {
  id: string;
  appointmentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  method: string | null;
  confirmedAt: string | null;
}

/**
 * Respuesta esperada de `POST /appointments/:id/payment` cuando exista: el
 * backend crea la preferencia en MercadoPago y devuelve adónde mandar al
 * paciente. **La tarjeta nunca pasa por MediConnect** —el PCI queda del lado de
 * MercadoPago (ADR-013)—, así que esta pantalla no tiene ni va a tener campos de
 * tarjeta.
 */
export interface CheckoutPreference {
  preferenceId: string;
  /** URL del checkout de MercadoPago a la que se redirige. */
  initPoint: string;
}
