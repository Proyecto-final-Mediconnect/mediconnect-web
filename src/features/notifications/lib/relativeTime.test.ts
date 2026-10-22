import { describe, expect, it } from 'vitest';
import { relativeTime } from './relativeTime';

const NOW = new Date('2026-10-21T15:00:00.000Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

describe('relativeTime', () => {
  it('menos de un minuto es "recién"', () => {
    expect(relativeTime(NOW, ago(20_000))).toBe('recién');
  });

  it('minutos y horas en relativo', () => {
    expect(relativeTime(NOW, ago(5 * 60_000))).toBe('hace 5 minutos');
    expect(relativeTime(NOW, ago(3 * 3_600_000))).toBe('hace 3 horas');
  });

  it('el día anterior es "ayer"', () => {
    expect(relativeTime(NOW, ago(30 * 3_600_000))).toBe('ayer');
  });

  it('después de una semana, la fecha corta', () => {
    expect(relativeTime(NOW, '2026-10-01T15:00:00.000Z')).toBe('1 oct');
  });

  it('una fecha inválida no se muestra', () => {
    expect(relativeTime(NOW, 'no-es-fecha')).toBe('');
  });
});
