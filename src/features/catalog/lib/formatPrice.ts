/** Formatea el precio de consulta con la moneda que informa el backend. */
export function formatPrice(price: number | null, currency: string): string {
  // Solo `null` significa "sin precio cargado": un 0 es un precio real.
  if (price === null) return 'Precio a consultar';

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}
