import { describe, expect, it } from 'vitest';
import { buildCatalogQuery, PAGE_SIZE } from './listProfessionals';
import { EMPTY_FILTERS } from '../types/catalog';

function params(query: string) {
  return Object.fromEntries(new URLSearchParams(query));
}

describe('buildCatalogQuery', () => {
  it('pide 20 por página (criterio de ENG-49)', () => {
    expect(PAGE_SIZE).toBe(20);
    expect(params(buildCatalogQuery(EMPTY_FILTERS, 1))).toEqual({
      page: '1',
      limit: '20',
    });
  });

  it('omite los filtros vacíos en vez de mandarlos en blanco', () => {
    // `minPrice=` no es un número: el backend lo rechazaría con 400.
    const query = buildCatalogQuery(EMPTY_FILTERS, 2);

    expect(query).not.toContain('specialtyId');
    expect(query).not.toContain('minPrice');
    expect(query).not.toContain('maxPrice');
  });

  it('incluye los filtros cargados', () => {
    const query = buildCatalogQuery(
      {
        specialtyId: '33333333-3333-4333-8333-333333333333',
        minPrice: '5000',
        maxPrice: '15000',
      },
      3,
    );

    expect(params(query)).toEqual({
      page: '3',
      limit: '20',
      specialtyId: '33333333-3333-4333-8333-333333333333',
      minPrice: '5000',
      maxPrice: '15000',
    });
  });

  it('recorta los espacios de los precios', () => {
    const query = buildCatalogQuery({ ...EMPTY_FILTERS, minPrice: '  5000  ' }, 1);

    expect(params(query).minPrice).toBe('5000');
  });

  it('trata un precio con solo espacios como sin filtro', () => {
    const query = buildCatalogQuery({ ...EMPTY_FILTERS, maxPrice: '   ' }, 1);

    expect(query).not.toContain('maxPrice');
  });
});
