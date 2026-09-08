import { describe, expect, it } from 'vitest';
import { describeDuration, formatClock, formatElapsed } from './elapsed';

describe('formatElapsed', () => {
  it('cuenta minutos y segundos', () => {
    expect(formatElapsed(0)).toBe('00:00');
    expect(formatElapsed(62_000)).toBe('01:02');
    expect(formatElapsed(18 * 60_000 + 42_000)).toBe('18:42');
  });

  it('pasada la hora agrega el campo de horas y no reinicia los minutos', () => {
    // Una consulta larga tiene que mostrar 1:15:00, no 15:00.
    expect(formatElapsed(75 * 60_000)).toBe('1:15:00');
    expect(formatElapsed(3_600_000)).toBe('1:00:00');
  });

  it('un tiempo negativo se muestra en cero', () => {
    // Pasa si el reloj del cliente atrasa respecto del momento de entrada:
    // mostrar "-00:03" sería peor que mostrar cero.
    expect(formatElapsed(-5000)).toBe('00:00');
  });

  it('trunca los milisegundos sueltos hacia abajo', () => {
    expect(formatElapsed(1999)).toBe('00:01');
  });
});

describe('describeDuration', () => {
  it('redondea a minutos', () => {
    expect(describeDuration(22 * 60_000)).toBe('22 minutos');
    expect(describeDuration(21.6 * 60_000)).toBe('22 minutos');
  });

  it('el singular no lleva ese', () => {
    expect(describeDuration(60_000)).toBe('1 minuto');
  });

  it('una consulta de segundos igual cuenta como un minuto', () => {
    // "0 minutos" sonaría a que no pasó nada; el piso es 1.
    expect(describeDuration(4000)).toBe('1 minuto');
  });
});

describe('formatClock', () => {
  it('rellena con cero a la izquierda', () => {
    expect(formatClock(new Date(2026, 8, 3, 9, 5))).toBe('09:05');
    expect(formatClock(new Date(2026, 8, 3, 18, 42))).toBe('18:42');
  });
});
