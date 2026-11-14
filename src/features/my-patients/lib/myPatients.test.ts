import { describe, expect, it } from 'vitest';
import { formatMoment } from './myPatients';

const NOW = new Date('2026-11-14T15:00:00Z');

describe('formatMoment (ENG-197)', () => {
  it('este año: día, mes y hora en Argentina', () => {
    expect(
      formatMoment({ at: '2026-11-12T13:00:00Z', date: '2026-11-12', startTime: '10:00' }, NOW),
    ).toBe('12 de noviembre · 10:00');
  });

  it('otro año: le agrega el año para no confundirlo', () => {
    expect(
      formatMoment({ at: '2025-03-03T12:30:00Z', date: '2025-03-03', startTime: '09:30' }, NOW),
    ).toBe('3 de marzo de 2025 · 09:30');
  });
});
