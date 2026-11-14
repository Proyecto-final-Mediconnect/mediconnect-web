/**
 * Un monto con su moneda, como lo muestra mobile: "$18.000", sin espacio.
 *
 * `Intl` en es-AR pone un espacio duro entre el símbolo y el número ("$ 18.000")
 * y la web y la app mostraban el mismo precio de dos formas. Se arma con
 * `formatToParts` para sacar solo ese espacio.
 *
 * `Intl.NumberFormat` tira `RangeError` con un código que no sea ISO 4217: en
 * ese caso se muestra el código y el número ("XXX 15.000"), o "$15.000" si ni
 * siquiera es un código.
 */
export function formatMoney(amount: number, currency: string): string {
  try {
    const partes = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).formatToParts(amount);
    // Solo se pega a un símbolo ("$"): un código ("USD 15") necesita el espacio.
    const simbolo = !/[A-Za-z]/.test(partes.find((p) => p.type === 'currency')?.value ?? '');
    return partes
      .filter((p) => !(simbolo && p.type === 'literal' && p.value.trim() === ''))
      .map((p) => p.value)
      .join('');
  } catch {
    const amountText = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(amount);
    return /^[A-Za-z]{3}$/.test(currency)
      ? `${currency.toUpperCase()} ${amountText}`
      : `$${amountText}`;
  }
}
