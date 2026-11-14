import { describe, expect, it } from 'vitest';
import { formatMoney } from './formatMoney';

describe('formatMoney', () => {
  it('pesos sin espacio entre el símbolo y el número, como en mobile', () => {
    expect(formatMoney(18000, 'ARS')).toBe('$18.000');
    expect(formatMoney(0, 'ARS')).toBe('$0');
  });

  it('un código de moneda inválido no rompe: muestra el código y el número', () => {
    expect(formatMoney(15000, 'XX')).toBe('$15.000');
  });

  it('con un código de letras conserva el espacio', () => {
    expect(formatMoney(15000, 'USD')).not.toMatch(/[A-Z]\d/);
  });
});
