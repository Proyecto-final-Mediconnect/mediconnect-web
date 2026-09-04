import { describe, expect, it } from 'vitest';
import type { ProfessionalCard } from '../types/catalog';
import {
  applyLocalFilters,
  EMPTY_LOCAL_FILTERS,
  hasLocalFilters,
} from './localCatalogFilters';
import { mockDetailsFor } from './mockProfessionalDetails';

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

  it('detecta cada filtro por separado', () => {
    expect(hasLocalFilters({ ...EMPTY_LOCAL_FILTERS, query: 'ana' })).toBe(true);
    expect(hasLocalFilters({ ...EMPTY_LOCAL_FILTERS, withinDays: 7 })).toBe(true);
    expect(hasLocalFilters({ ...EMPTY_LOCAL_FILTERS, minRating: 4 })).toBe(true);
  });

  it('`withinDays: 0` es "hoy", no "sin filtro"', () => {
    expect(hasLocalFilters({ ...EMPTY_LOCAL_FILTERS, withinDays: 0 })).toBe(true);
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

  it('filtra por calificación mínima usando el dato mock', () => {
    const filtrados = applyLocalFilters(TODOS, { ...EMPTY_LOCAL_FILTERS, minRating: 4.5 });

    expect(filtrados.length).toBeLessThanOrEqual(TODOS.length);
    for (const profesional of filtrados) {
      expect(mockDetailsFor(profesional).rating).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('filtra por disponibilidad usando el dato mock', () => {
    const filtrados = applyLocalFilters(TODOS, { ...EMPTY_LOCAL_FILTERS, withinDays: 2 });

    for (const profesional of filtrados) {
      expect(mockDetailsFor(profesional).nextSlotInDays).toBeLessThanOrEqual(2);
    }
  });

  it('combina búsqueda y calificación con AND', () => {
    const soloAna = applyLocalFilters(TODOS, {
      ...EMPTY_LOCAL_FILTERS,
      query: 'ana',
      minRating: 5.1, // imposible: ningún mock llega
    });

    expect(soloAna).toEqual([]);
  });
});

describe('mockDetailsFor', () => {
  it('es determinístico: el mismo id da siempre lo mismo', () => {
    expect(mockDetailsFor(ANA)).toEqual(mockDetailsFor({ ...ANA }));
  });

  it('distintos profesionales no comparten todos los valores', () => {
    expect(mockDetailsFor(ANA)).not.toEqual(mockDetailsFor(BRUNO));
  });

  it('los valores caen en los rangos que la UI espera', () => {
    for (const profesional of TODOS) {
      const mock = mockDetailsFor(profesional);

      expect(mock.rating).toBeGreaterThanOrEqual(3.6);
      expect(mock.rating).toBeLessThanOrEqual(5);
      expect(mock.reviewCount).toBeGreaterThan(0);
      expect(mock.yearsOfExperience).toBeGreaterThan(0);
      expect(mock.nextSlotInDays).toBeGreaterThanOrEqual(0);
      expect(mock.licenseNumber).toMatch(/^\d{5,6}$/);
    }
  });
});
