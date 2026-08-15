import { describe, expect, it } from 'vitest';
import {
  BOOKING_WEEKS,
  MAX_WEEK_OFFSET,
  formatDate,
  formatPrice,
  formatShortDate,
  weekRange,
} from './weeks';

describe('weekRange', () => {
  it('la semana 0 va del lunes al domingo de la semana en curso', () => {
    // Miércoles 19/08/2026.
    expect(weekRange(0, '2026-08-19')).toEqual({
      from: '2026-08-17',
      to: '2026-08-23',
    });
  });

  it('el domingo pertenece a la semana que arrancó seis días antes', () => {
    // Sin este caso, mirar la agenda un domingo saltaría a la semana siguiente.
    expect(weekRange(0, '2026-08-23')).toEqual({
      from: '2026-08-17',
      to: '2026-08-23',
    });
  });

  it('cada offset corre la semana siete días', () => {
    expect(weekRange(1, '2026-08-19').from).toBe('2026-08-24');
    expect(weekRange(3, '2026-08-19').from).toBe('2026-09-07');
  });

  it('cruza el fin de mes', () => {
    expect(weekRange(2, '2026-08-19')).toEqual({
      from: '2026-08-31',
      to: '2026-09-06',
    });
  });

  it('la última semana navegable nunca supera el horizonte de 28 días', () => {
    // El backend rechaza `to` más allá de hoy + 27. La semana 0 arranca el lunes,
    // que nunca es posterior a hoy, así que el domingo de la última semana cae
    // como mucho en hoy + 27. El peor caso es que hoy SEA lunes.
    const today = '2026-08-17'; // lunes
    const { to } = weekRange(MAX_WEEK_OFFSET, today);

    const horizon = new Date('2026-08-17T00:00:00Z');
    horizon.setUTCDate(horizon.getUTCDate() + 27);

    expect(Date.parse(`${to}T00:00:00Z`)).toBeLessThanOrEqual(horizon.getTime());
  });

  it('navega exactamente 4 semanas', () => {
    expect(BOOKING_WEEKS).toBe(4);
    expect(MAX_WEEK_OFFSET).toBe(3);
  });
});

describe('formato', () => {
  it('escribe la fecha en español', () => {
    expect(formatDate('2026-09-02')).toBe('2 de septiembre');
    expect(formatDate('2026-01-31')).toBe('31 de enero');
  });

  it('acorta la fecha para los encabezados de la grilla', () => {
    expect(formatShortDate('2026-09-02')).toBe('2/9');
  });

  it('muestra el precio en pesos y sin decimales', () => {
    // El separador que devuelve Intl varía entre entornos; lo que importa es que
    // el número esté completo y sin centavos.
    const formatted = formatPrice(15000, 'ARS');

    expect(formatted).toContain('15');
    expect(formatted).toContain('000');
    expect(formatted).not.toContain(',00');
  });
});
