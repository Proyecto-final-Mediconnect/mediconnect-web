import { describe, expect, it } from 'vitest';
import type { ScheduleRule } from '../types/schedule';
import { findOverlap, validateRules } from './validateRules';

function rule(
  weekday: number,
  startTime: string,
  endTime: string,
  slotDurationMinutes = 30,
): ScheduleRule {
  return { weekday, startTime, endTime, slotDurationMinutes };
}

describe('validateRules (ENG-53)', () => {
  it('acepta una agenda vacía', () => {
    expect(validateRules([])).toBeNull();
  });

  it('acepta turno mañana y turno tarde el mismo día', () => {
    expect(
      validateRules([rule(2, '09:00', '13:00'), rule(2, '16:00', '20:00')]),
    ).toBeNull();
  });

  it('acepta franjas contiguas', () => {
    expect(
      validateRules([rule(2, '09:00', '13:00'), rule(2, '13:00', '17:00')]),
    ).toBeNull();
  });

  it('rechaza que el fin sea anterior al inicio, nombrando el día', () => {
    const mensaje = validateRules([rule(1, '18:00', '09:00')]);

    expect(mensaje).toContain('Lunes');
    expect(mensaje).toContain('posterior');
  });

  it('rechaza una franja más corta que un turno', () => {
    const mensaje = validateRules([rule(3, '09:00', '09:20', 30)]);

    expect(mensaje).toContain('Miércoles');
    expect(mensaje).toContain('no genera ninguno');
  });

  it('rechaza franjas superpuestas, nombrando ambas', () => {
    const mensaje = validateRules([
      rule(4, '09:00', '13:00'),
      rule(4, '12:00', '16:00'),
    ]);

    expect(mensaje).toContain('Jueves');
    expect(mensaje).toContain('09:00-13:00');
    expect(mensaje).toContain('12:00-16:00');
  });

  it('reporta el rango inválido antes que el solape', () => {
    // Si una franja está mal formada, señalarla es más útil que hablar de un
    // solape que probablemente sea consecuencia de ese mismo error.
    const mensaje = validateRules([
      rule(4, '13:00', '09:00'),
      rule(4, '12:00', '16:00'),
    ]);

    expect(mensaje).toContain('posterior');
  });
});

describe('findOverlap', () => {
  it('no marca solape entre días distintos con el mismo horario', () => {
    expect(
      findOverlap([rule(1, '09:00', '13:00'), rule(2, '09:00', '13:00')]),
    ).toBeNull();
  });

  it('detecta una franja contenida dentro de otra', () => {
    expect(
      findOverlap([rule(5, '08:00', '20:00'), rule(5, '10:00', '11:00')]),
    ).not.toBeNull();
  });
});
