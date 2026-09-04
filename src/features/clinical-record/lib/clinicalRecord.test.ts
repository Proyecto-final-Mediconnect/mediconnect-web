import { describe, expect, it } from 'vitest';
import {
  applyClinicalFilters,
  correctionsByEntry,
  hasClinicalFilters,
  newestFirst,
  professionalsIn,
} from './clinicalRecord';
import {
  EMPTY_CLINICAL_FILTERS,
  type ClinicalEntryCard,
} from '../types/clinicalRecord';

function entrada(overrides: Partial<ClinicalEntryCard> & { id: string }): ClinicalEntryCard {
  return {
    codigo: `REG-${overrides.id}`,
    tipo: 'CONSULTA',
    fecha: '2026-06-13T21:02:00.000Z',
    motivo: 'Control',
    professionalId: 'pro-1',
    profesional: 'Dra. Valeria Ocampo · Cardiología',
    evolucion: 'Sin cambios',
    diagnostico: 'HTA',
    plan: 'Dieta hiposódica y enalapril',
    adjunto: null,
    correctsEntryId: null,
    sequenceNumber: 1,
    ...overrides,
  };
}

describe('correctionsByEntry', () => {
  it('indexa la corrección por la entrada que corrige', () => {
    const original = entrada({ id: 'a', sequenceNumber: 1 });
    const correccion = entrada({
      id: 'b',
      sequenceNumber: 2,
      tipo: 'CORRECCION',
      correctsEntryId: 'a',
    });

    expect(correctionsByEntry([original, correccion]).get('a')?.id).toBe('b');
  });

  it('con dos correcciones de la misma entrada gana la última', () => {
    // La vigente es la más nueva, no la primera que se encuentre.
    const primera = entrada({ id: 'b', sequenceNumber: 2, correctsEntryId: 'a' });
    const segunda = entrada({ id: 'c', sequenceNumber: 5, correctsEntryId: 'a' });

    // Se pasan desordenadas a propósito.
    expect(correctionsByEntry([segunda, primera]).get('a')?.id).toBe('c');
  });

  it('sin correcciones el índice queda vacío', () => {
    expect(correctionsByEntry([entrada({ id: 'a' })]).size).toBe(0);
  });
});

describe('newestFirst', () => {
  it('ordena por número de secuencia, de mayor a menor', () => {
    const orden = newestFirst([
      entrada({ id: 'a', sequenceNumber: 1 }),
      entrada({ id: 'c', sequenceNumber: 9 }),
      entrada({ id: 'b', sequenceNumber: 4 }),
    ]);

    expect(orden.map((e) => e.id)).toEqual(['c', 'b', 'a']);
  });

  it('no muta la lista que recibe', () => {
    const original = [
      entrada({ id: 'a', sequenceNumber: 1 }),
      entrada({ id: 'b', sequenceNumber: 2 }),
    ];
    newestFirst(original);

    expect(original.map((e) => e.id)).toEqual(['a', 'b']);
  });
});

describe('applyClinicalFilters', () => {
  const entradas = [
    entrada({ id: 'a', tipo: 'CONSULTA', fecha: '2026-03-02T13:05:00.000Z' }),
    entrada({
      id: 'b',
      tipo: 'ESTUDIO',
      fecha: '2026-06-12T14:20:00.000Z',
      adjunto: 'Laboratorio · PDF',
      professionalId: 'lab-1',
      profesional: 'Laboratorio Central',
    }),
    entrada({
      id: 'c',
      tipo: 'CORRECCION',
      fecha: '2026-06-13T21:02:00.000Z',
      correctsEntryId: 'b',
    }),
  ];

  it('sin filtros devuelve todo', () => {
    expect(applyClinicalFilters(entradas, EMPTY_CLINICAL_FILTERS)).toHaveLength(3);
  });

  it('filtra por tipo', () => {
    const r = applyClinicalFilters(entradas, { ...EMPTY_CLINICAL_FILTERS, tipo: 'ESTUDIO' });

    expect(r.map((e) => e.id)).toEqual(['b']);
  });

  it('filtra por profesional', () => {
    const r = applyClinicalFilters(entradas, {
      ...EMPTY_CLINICAL_FILTERS,
      professionalId: 'lab-1',
    });

    expect(r.map((e) => e.id)).toEqual(['b']);
  });

  it('"con adjuntos" deja solo las que tienen archivo', () => {
    const r = applyClinicalFilters(entradas, {
      ...EMPTY_CLINICAL_FILTERS,
      soloConAdjuntos: true,
    });

    expect(r.map((e) => e.id)).toEqual(['b']);
  });

  it('"solo correcciones" deja las que corrigen a otra', () => {
    const r = applyClinicalFilters(entradas, {
      ...EMPTY_CLINICAL_FILTERS,
      soloCorrecciones: true,
    });

    expect(r.map((e) => e.id)).toEqual(['c']);
  });

  it('el rango de fechas incluye los dos extremos', () => {
    // Quien filtra "hasta el 12/06" espera ver lo del 12/06.
    const r = applyClinicalFilters(entradas, {
      ...EMPTY_CLINICAL_FILTERS,
      desde: '2026-06-12',
      hasta: '2026-06-12',
    });

    expect(r.map((e) => e.id)).toEqual(['b']);
  });

  it('los filtros se combinan con Y', () => {
    const r = applyClinicalFilters(entradas, {
      ...EMPTY_CLINICAL_FILTERS,
      tipo: 'CONSULTA',
      soloConAdjuntos: true,
    });

    expect(r).toEqual([]);
  });
});

describe('hasClinicalFilters', () => {
  it('sin nada puesto es false', () => {
    expect(hasClinicalFilters(EMPTY_CLINICAL_FILTERS)).toBe(false);
  });

  it('alcanza con una casilla', () => {
    expect(
      hasClinicalFilters({ ...EMPTY_CLINICAL_FILTERS, soloConAdjuntos: true }),
    ).toBe(true);
  });

  it('una fecha suelta también cuenta', () => {
    expect(hasClinicalFilters({ ...EMPTY_CLINICAL_FILTERS, desde: '2026-01-01' })).toBe(true);
  });
});

describe('professionalsIn', () => {
  it('lista cada profesional una sola vez', () => {
    const r = professionalsIn([
      entrada({ id: 'a' }),
      entrada({ id: 'b' }),
      entrada({ id: 'c', professionalId: 'lab-1', profesional: 'Laboratorio Central' }),
    ]);

    expect(r).toEqual([
      { id: 'pro-1', nombre: 'Dra. Valeria Ocampo · Cardiología' },
      { id: 'lab-1', nombre: 'Laboratorio Central' },
    ]);
  });
});
