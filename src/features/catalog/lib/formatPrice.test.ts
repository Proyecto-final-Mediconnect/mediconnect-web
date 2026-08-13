import { describe, expect, it } from 'vitest';
import { formatPrice } from './formatPrice';

describe('formatPrice', () => {
  it('formatea en la moneda que informa el backend', () => {
    expect(formatPrice(12000, 'ARS')).toMatch(/12\.000/);
  });

  it('respeta una moneda distinta de ARS', () => {
    expect(formatPrice(100, 'USD')).toMatch(/100/);
  });

  it('no inventa un precio cuando el profesional no lo cargó', () => {
    expect(formatPrice(null, 'ARS')).toBe('Precio a consultar');
  });

  it('trata el 0 como precio real, no como ausente', () => {
    expect(formatPrice(0, 'ARS')).not.toBe('Precio a consultar');
  });
});
