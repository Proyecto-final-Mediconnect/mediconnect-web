import { describe, expect, it } from 'vitest';
import { periodRange } from './period';

describe('períodos del resumen (ENG-198)', () => {
  const NOW = new Date('2026-11-20T15:00:00Z');

  it('los últimos 30 días incluyen hoy', () => {
    expect(periodRange('30D', NOW)).toEqual({ from: '2026-10-22', to: '2026-11-20' });
  });

  it('este año va del 1 de enero a hoy, en Argentina', () => {
    expect(periodRange('ANIO', NOW)).toEqual({ from: '2026-01-01', to: '2026-11-20' });
    // 1 de enero a la 01:00 UTC: en Argentina todavía es 31 de diciembre.
    expect(periodRange('ANIO', new Date('2027-01-01T01:00:00Z')).from).toBe('2026-01-01');
  });
});
