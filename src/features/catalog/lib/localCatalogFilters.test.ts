import { describe, expect, it } from 'vitest';
import type { ProfessionalCard } from '../types/catalog';
import { applyLocalFilters, EMPTY_LOCAL_FILTERS, hasLocalFilters } from './localCatalogFilters';

const CARDIO = { id: 'esp-1', name: 'Cardiología' };
const PEDIA = { id: 'esp-2', name: 'Pediatría' };

function card(
  id: string,
  firstName: string,
  lastName: string,
  specialty = CARDIO,
): ProfessionalCard {
  return {
    id,
    firstName,
    lastName,
    photoUrl: null,
    primarySpecialty: specialty,
    specialties: [specialty],
    price: 15000,
    currency: 'ARS',
  };
}

const ANA = card('a-1', 'Ana', 'García');
const BRUNO = card('b-2', 'Bruno', 'Pérez', PEDIA);
const CARLA = card('c-3', 'Carla', 'Núñez');
const TODOS = [ANA, BRUNO, CARLA];

describe('hasLocalFilters', () => {
  it('el estado vacío no cuenta como filtro', () => {
    expect(hasLocalFilters(EMPTY_LOCAL_FILTERS)).toBe(false);
  });

  it('una búsqueda de solo espacios tampoco', () => {
    expect(hasLocalFilters({ ...EMPTY_LOCAL_FILTERS, query: '   ' })).toBe(false);
  });

  it('una búsqueda con texto sí cuenta', () => {
    expect(hasLocalFilters({ ...EMPTY_LOCAL_FILTERS, query: 'ana' })).toBe(true);
  });

  it('no quedan filtros sobre datos que la API no sirve (ENG-150)', () => {
    // Disponibilidad y calificación filtraban sobre valores inventados. Se fija
    // la forma del estado para que no vuelvan sin un dato real detrás.
    expect(Object.keys(EMPTY_LOCAL_FILTERS)).toEqual(['query']);
  });
});

describe('applyLocalFilters', () => {
  it('sin filtros devuelve la lista tal cual', () => {
    expect(applyLocalFilters(TODOS, EMPTY_LOCAL_FILTERS)).toBe(TODOS);
  });

  it('busca por nombre y por apellido', () => {
    expect(applyLocalFilters(TODOS, { ...EMPTY_LOCAL_FILTERS, query: 'bruno' })).toEqual([BRUNO]);
    expect(applyLocalFilters(TODOS, { ...EMPTY_LOCAL_FILTERS, query: 'garcía' })).toEqual([ANA]);
  });

  it('busca por especialidad', () => {
    expect(applyLocalFilters(TODOS, { ...EMPTY_LOCAL_FILTERS, query: 'pediatría' })).toEqual([
      BRUNO,
    ]);
  });

  it('ignora acentos y mayúsculas en los dos sentidos', () => {
    // Escrito sin acento, el dato lo tiene.
    expect(applyLocalFilters(TODOS, { ...EMPTY_LOCAL_FILTERS, query: 'PEDIATRIA' })).toEqual([
      BRUNO,
    ]);
    expect(applyLocalFilters(TODOS, { ...EMPTY_LOCAL_FILTERS, query: 'nunez' })).toEqual([CARLA]);
  });

  it('ignora los espacios de los bordes', () => {
    expect(applyLocalFilters(TODOS, { ...EMPTY_LOCAL_FILTERS, query: '  ana  ' })).toEqual([ANA]);
  });

  it('sin coincidencias devuelve vacío', () => {
    expect(applyLocalFilters(TODOS, { ...EMPTY_LOCAL_FILTERS, query: 'zzz' })).toEqual([]);
  });
});
