import { describe, expect, it } from 'vitest';
import { PRICE_RANGE_ERROR, validatePriceRange } from './priceRange';

function filters(minPrice: string, maxPrice: string) {
  return { specialtyId: '', minPrice, maxPrice };
}

describe('validatePriceRange', () => {
  it('acepta un rango vacío', () => {
    expect(validatePriceRange(filters('', ''))).toBeUndefined();
  });

  it('acepta un solo extremo cargado', () => {
    expect(validatePriceRange(filters('5000', ''))).toBeUndefined();
    expect(validatePriceRange(filters('', '5000'))).toBeUndefined();
  });

  it('acepta un rango de un único valor', () => {
    expect(validatePriceRange(filters('5000', '5000'))).toBeUndefined();
  });

  it('acepta un rango creciente', () => {
    expect(validatePriceRange(filters('5000', '15000'))).toBeUndefined();
  });

  it('rechaza un rango invertido', () => {
    expect(validatePriceRange(filters('9000', '100'))).toBe(PRICE_RANGE_ERROR);
  });

  it('compara como número, no como string', () => {
    // '9' > '100' lexicográficamente, pero 9 < 100: el rango es válido.
    expect(validatePriceRange(filters('9', '100'))).toBeUndefined();
  });
});
