import { describe, expect, it } from 'vitest';
import {
  activityRange,
  barHeights,
  formatRate,
  formatRating,
  isEmptyPeriod,
  monthLong,
  monthShort,
  plural,
  rateBase,
} from './activity';
import type { ProfessionalStats } from '../types';

// 14 de noviembre de 2026, mediodía en Argentina.
const NOW = new Date('2026-11-14T15:00:00Z');

const VACIO: ProfessionalStats = {
  from: '2026-11-01',
  to: '2026-11-30',
  turnos: { completados: 0, noAsistio: 0, cancelados: 0, liberados: 0, porVenir: 0 },
  tasas: { cancelacion: null, ausentismo: null },
  consultasPorMes: [{ mes: '2026-11', consultas: 0 }],
  pacientes: { unicos: 0, recurrentes: 0 },
  resenas: { promedio: null, cantidad: 0, sinResponder: 0 },
};

describe('períodos de Mi actividad', () => {
  it('son meses enteros, el actual incluido hasta su último día', () => {
    expect(activityRange('MES', NOW)).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(activityRange('3M', NOW)).toEqual({ from: '2026-09-01', to: '2026-11-30' });
    expect(activityRange('12M', NOW)).toEqual({ from: '2025-12-01', to: '2026-11-30' });
  });

  it('usa el mes de Argentina y no el de UTC', () => {
    // 1 de diciembre 01:00 UTC = 30 de noviembre 22:00 en Argentina.
    expect(activityRange('MES', new Date('2026-12-01T01:00:00Z'))).toEqual({
      from: '2026-11-01',
      to: '2026-11-30',
    });
  });

  it('respeta febrero y los bisiestos', () => {
    expect(activityRange('MES', new Date('2028-02-10T15:00:00Z')).to).toBe('2028-02-29');
  });
});

describe('formato', () => {
  it('las tasas van con un decimal y coma, y sin base son una raya', () => {
    expect(formatRate({ porcentaje: 8, numerador: 2, denominador: 25 })).toBe('8,0 %');
    expect(formatRate({ porcentaje: 8.7, numerador: 2, denominador: 23 })).toBe('8,7 %');
    expect(formatRate(null)).toBe('—');
    expect(rateBase({ porcentaje: 8, numerador: 2, denominador: 25 })).toBe('2 de 25');
  });

  it('el promedio de reseñas lleva coma decimal', () => {
    expect(formatRating(4.7)).toBe('4,7');
    expect(formatRating(5)).toBe('5,0');
  });

  it('nombra los meses en castellano', () => {
    expect(monthLong('2026-09')).toBe('septiembre de 2026');
    expect(monthShort('2026-09')).toBe('sep');
  });

  it('pluraliza', () => {
    expect(plural(1, 'reseña')).toBe('1 reseña');
    expect(plural(3, 'reseña')).toBe('3 reseñas');
  });
});

describe('barras y vacío', () => {
  it('el alto es relativo al mes con más consultas', () => {
    expect(barHeights([2, 8, 4])).toEqual([25, 100, 50]);
    expect(barHeights([0, 0])).toEqual([0, 0]);
  });

  it('el período está vacío solo sin turnos ni reseñas', () => {
    expect(isEmptyPeriod(VACIO)).toBe(true);
    expect(isEmptyPeriod({ ...VACIO, turnos: { ...VACIO.turnos, porVenir: 1 } })).toBe(false);
    expect(isEmptyPeriod({ ...VACIO, resenas: { ...VACIO.resenas, cantidad: 1 } })).toBe(false);
  });
});
