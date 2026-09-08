import { describe, expect, it } from 'vitest';
import {
  FILTROS_VACIOS,
  filtrarEntradas,
  idsEnCorreccion,
  nombreDe,
  opcionesDe,
  type FiltrosHC,
} from './filtrarEntradas';
import type { ClinicalEntry } from '../types/clinicalRecord';

function entrada(overrides: Partial<ClinicalEntry> = {}): ClinicalEntry {
  return {
    id: 'e1',
    patientId: 'p1',
    professionalId: 'q1',
    professional: { firstName: 'Ana', lastName: 'Ríos' },
    sequenceNumber: 1,
    entryType: 'CONSULTA',
    fhirResourceType: 'Encounter',
    content: { motivo: 'Control' },
    consultationId: null,
    correctsEntryId: null,
    createdAt: '2026-08-20T13:00:00.000Z',
    contentHash: 'a'.repeat(64),
    previousHash: '0'.repeat(64),
    ...overrides,
  };
}

const con = (over: Partial<FiltrosHC>): FiltrosHC => ({ ...FILTROS_VACIOS, ...over });

describe('filtrarEntradas', () => {
  it('sin filtros devuelve todo', () => {
    const todas = [entrada(), entrada({ id: 'e2' })];
    expect(filtrarEntradas(todas, FILTROS_VACIOS)).toHaveLength(2);
  });

  it('filtra por tipo', () => {
    const todas = [entrada(), entrada({ id: 'e2', entryType: 'PRESCRIPCION' })];
    expect(filtrarEntradas(todas, con({ tipo: 'PRESCRIPCION' })).map((e) => e.id)).toEqual(['e2']);
  });

  it('filtra por profesional', () => {
    const todas = [
      entrada(),
      entrada({ id: 'e2', professional: { firstName: 'Martín', lastName: 'Olivares' } }),
    ];
    expect(filtrarEntradas(todas, con({ profesional: 'Martín Olivares' })).map((e) => e.id)).toEqual(
      ['e2'],
    );
  });

  describe('rango de fechas', () => {
    it('incluye los extremos', () => {
      const todas = [entrada({ createdAt: '2026-08-20T13:00:00.000Z' })];

      expect(filtrarEntradas(todas, con({ desde: '2026-08-20', hasta: '2026-08-20' }))).toHaveLength(
        1,
      );
    });

    it('deja afuera lo anterior y lo posterior', () => {
      const todas = [
        entrada({ id: 'antes', createdAt: '2026-07-01T13:00:00.000Z' }),
        entrada({ id: 'dentro', createdAt: '2026-08-20T13:00:00.000Z' }),
        entrada({ id: 'despues', createdAt: '2026-09-30T13:00:00.000Z' }),
      ];

      expect(
        filtrarEntradas(todas, con({ desde: '2026-08-01', hasta: '2026-08-31' })).map((e) => e.id),
      ).toEqual(['dentro']);
    });

    /**
     * El input de fecha que elige la persona es local. Comparando contra la
     * fecha UTC, una consulta de las 22:00 en Argentina (01:00 UTC del día
     * siguiente) desaparecía del filtro del día en que ocurrió.
     */
    it('usa el día local y no el UTC', () => {
      const local = new Date(2026, 7, 20, 22, 0, 0); // 20/08/2026 22:00 local
      const todas = [entrada({ createdAt: local.toISOString() })];

      expect(
        filtrarEntradas(todas, con({ desde: '2026-08-20', hasta: '2026-08-20' })),
      ).toHaveLength(1);
    });
  });

  it('solo correcciones trae los dos lados del vínculo', () => {
    const todas = [
      entrada({ id: 'original', sequenceNumber: 1 }),
      entrada({ id: 'suelta', sequenceNumber: 2 }),
      entrada({ id: 'correccion', sequenceNumber: 3, correctsEntryId: 'original' }),
    ];

    // La corregida importa tanto como la corrección: filtrar por "correcciones"
    // y ver solo la nueva escondería justamente lo que se corrigió.
    expect(filtrarEntradas(todas, con({ soloCorrecciones: true })).map((e) => e.id)).toEqual([
      'original',
      'correccion',
    ]);
  });

  it('los filtros se acumulan', () => {
    const todas = [
      entrada({ id: 'e1', entryType: 'CONSULTA' }),
      entrada({
        id: 'e2',
        entryType: 'CONSULTA',
        professional: { firstName: 'Martín', lastName: 'Olivares' },
      }),
    ];

    expect(
      filtrarEntradas(todas, con({ tipo: 'CONSULTA', profesional: 'Ana Ríos' })).map((e) => e.id),
    ).toEqual(['e1']);
  });
});

describe('opcionesDe', () => {
  it('ofrece solo lo que existe en esta historia, sin repetir', () => {
    // Un desplegable con los cinco tipos posibles cuando la cadena tiene dos
    // ofrece tres filtros que siempre devuelven vacío.
    const todas = [
      entrada({ id: 'e1', entryType: 'CONSULTA' }),
      entrada({ id: 'e2', entryType: 'CONSULTA' }),
      entrada({
        id: 'e3',
        entryType: 'ESTUDIO',
        professional: { firstName: 'Martín', lastName: 'Olivares' },
      }),
    ];

    expect(opcionesDe(todas)).toEqual({
      tipos: ['CONSULTA', 'ESTUDIO'],
      profesionales: ['Ana Ríos', 'Martín Olivares'],
    });
  });
});

describe('nombreDe', () => {
  it('no rompe si el profesional no tiene perfil cargado', () => {
    // Es una historia clínica: perder el nombre es mejor que perder el registro.
    expect(nombreDe(entrada({ professional: null }))).toBe('Sin profesional');
  });
});

describe('idsEnCorreccion', () => {
  it('está vacío cuando no hay ninguna corrección', () => {
    expect(idsEnCorreccion([entrada()]).size).toBe(0);
  });
});
