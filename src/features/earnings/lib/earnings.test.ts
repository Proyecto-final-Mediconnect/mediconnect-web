import { describe, expect, it } from 'vitest';
import { currentMonth, earningChip, monthLabel, monthRange, shiftMonth } from './earnings';
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
    expect(monthLabel('2026-11')).toBe('noviembre de 2026');
  });

  it('el chip dice el porcentaje de un reembolso parcial', () => {
    const fila = { state: 'REEMBOLSO_PARCIAL', refundPercent: 50 } as EarningRow;
    expect(earningChip(fila)).toEqual({ label: 'Reembolsado 50 %', tone: 'warn' });
  });
});
