import { describe, expect, it } from 'vitest';
import {
  currentMonth,
  earningChip,
  monthLabel,
  monthRange,
  periodRange,
  shiftMonth,
} from './earnings';
import type { EarningRow } from '../types';

describe('Mis cobros: el mes (ENG-194)', () => {
  it('arma el período del mes, con febrero y años bisiestos', () => {
    expect(monthRange('2026-11')).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });

  it('pasa de mes cruzando el año', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });

  it('el mes de hoy es el de Argentina', () => {
    // 1 de diciembre a las 01:00 UTC: en Argentina todavía es 30 de noviembre.
    expect(currentMonth(new Date('2026-12-01T01:00:00Z'))).toBe('2026-11');
    expect(monthLabel('2026-11')).toBe('Noviembre de 2026');
  });

  it('el chip dice el porcentaje de un reembolso parcial', () => {
    const fila = { state: 'REEMBOLSO_PARCIAL', refundPercent: 50 } as EarningRow;
    expect(earningChip(fila)).toEqual({ label: 'Reembolsado 50 %', tone: 'warn' });
  });
});

describe('Mis cobros: otros períodos (ENG-194)', () => {
  const NOW = new Date('2026-11-20T15:00:00Z');
  const sin = { mes: '2026-11', desde: '', hasta: '' };

  it('últimos 30 y 90 días cuentan hoy; el año arranca el 1 de enero', () => {
    expect(periodRange('30D', sin, NOW)).toEqual({ from: '2026-10-22', to: '2026-11-20' });
    expect(periodRange('90D', sin, NOW)).toEqual({ from: '2026-08-23', to: '2026-11-20' });
    expect(periodRange('ANIO', sin, NOW)).toEqual({ from: '2026-01-01', to: '2026-11-20' });
  });

  it('un rango a mano incompleto, al revés o de más de un año da un mensaje', () => {
    expect(periodRange('RANGO', { ...sin, desde: '2026-11-01' }, NOW)).toEqual({
      error: 'Elegí las dos fechas.',
    });
    expect(
      periodRange('RANGO', { ...sin, desde: '2026-11-10', hasta: '2026-11-01' }, NOW),
    ).toHaveProperty('error');
    expect(periodRange('RANGO', { ...sin, desde: '2025-01-01', hasta: '2026-11-01' }, NOW)).toEqual(
      { error: 'Elegí un rango de hasta un año.' },
    );
    expect(periodRange('RANGO', { ...sin, desde: '2026-10-01', hasta: '2026-10-15' }, NOW)).toEqual(
      { from: '2026-10-01', to: '2026-10-15' },
    );
  });
});
