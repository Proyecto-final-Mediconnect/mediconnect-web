import { describe, expect, it } from 'vitest';
import { cuentaRegresiva } from './medipass';

describe('cuentaRegresiva', () => {
  it('formatea minutos y segundos', () => {
    expect(cuentaRegresiva(5 * 60_000)).toBe('05:00');
    expect(cuentaRegresiva(62_000)).toBe('01:02');
  });

  it('nunca muestra negativos', () => {
    expect(cuentaRegresiva(-5000)).toBe('00:00');
  });

  it('se corta en 59:59 en vez de agregar un campo de horas', () => {
    expect(cuentaRegresiva(3 * 60 * 60_000)).toBe('59:59');
  });
});
