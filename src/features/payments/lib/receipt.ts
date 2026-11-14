/**
 * El comprobante del pago (ENG-199), puro para poder testearlo sin React.
 */

/** Nombre visible del medio que informó MercadoPago (`payment_type_id`). */
const METHOD_LABELS: Record<string, string> = {
  account_money: 'Dinero en cuenta de MercadoPago',
  credit_card: 'Tarjeta de crédito',
  debit_card: 'Tarjeta de débito',
  prepaid_card: 'Tarjeta prepaga',
  ticket: 'Efectivo',
  bank_transfer: 'Transferencia',
};

/** Un medio desconocido o sin dato se muestra como "MercadoPago", nunca vacío. */
export function paymentMethodLabel(method: string | null | undefined): string {
  return (method && METHOD_LABELS[method]) ?? 'MercadoPago';
}
