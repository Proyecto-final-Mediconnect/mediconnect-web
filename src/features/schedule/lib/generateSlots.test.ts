import { describe, expect, it } from 'vitest';
import type { ScheduleBlock, ScheduleRule } from '../types/schedule';
import {
  addDays,
  buildWeekPreview,
  countSlots,
  mondayOf,
  slotsForRule,
  toMinutes,
  toTime,
  weekdayOf,
} from './generateSlots';

function rule(
  weekday: number,
  startTime: string,
  endTime: string,
  slotDurationMinutes = 30,
): ScheduleRule {
  return { weekday, startTime, endTime, slotDurationMinutes };
}

function block(
  blockDate: string,
  startTime: string | null = null,
  endTime: string | null = null,
): ScheduleBlock {
  return { id: `b-${blockDate}-${startTime}`, blockDate, startTime, endTime, reason: null };
}

// Miércoles 2 de septiembre de 2026. La semana de referencia arranca el lunes 31/08.
const WEEK_START = '2026-08-31';

describe('generateSlots — helpers de tiempo', () => {
  it('convierte HH:MM a minutos y vuelve', () => {
    expect(toMinutes('09:30')).toBe(570);
    expect(toTime(570)).toBe('09:30');
    expect(toTime(0)).toBe('00:00');
  });

  it('suma días cruzando fin de mes', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('suma días cruzando el 29 de febrero de un año bisiesto', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('calcula el día de la semana', () => {
    expect(weekdayOf('2026-08-31')).toBe(1); // lunes
    expect(weekdayOf('2026-09-06')).toBe(0); // domingo
  });

  describe('mondayOf', () => {
    it('devuelve el mismo día si ya es lunes', () => {
      expect(mondayOf('2026-08-31')).toBe('2026-08-31');
    });

    it('retrocede al lunes desde un miércoles', () => {
      expect(mondayOf('2026-09-02')).toBe('2026-08-31');
    });

    it('un domingo pertenece a la semana que ya arrancó, no a la siguiente', () => {
      expect(mondayOf('2026-09-06')).toBe('2026-08-31');
    });
  });
});

describe('slotsForRule', () => {
  it('parte la franja en turnos de la duración indicada', () => {
    expect(slotsForRule(rule(1, '09:00', '11:00', 30))).toEqual([
      '09:00',
      '09:30',
      '10:00',
      '10:30',
    ]);
  });

  it('no ofrece un turno que se pasaría del horario de atención', () => {
    // 09:00-10:20 con turnos de 30: el de 10:00 terminaría 10:30, fuera de la franja.
    expect(slotsForRule(rule(1, '09:00', '10:20', 30))).toEqual([
      '09:00',
      '09:30',
    ]);
  });

  it('devuelve vacío si la franja es más corta que un turno', () => {
    expect(slotsForRule(rule(1, '09:00', '09:20', 30))).toEqual([]);
  });

  it('devuelve vacío si el fin es anterior al inicio', () => {
    expect(slotsForRule(rule(1, '18:00', '09:00', 30))).toEqual([]);
  });

  it('respeta las cuatro duraciones del criterio de aceptación', () => {
    expect(slotsForRule(rule(1, '09:00', '10:00', 15))).toHaveLength(4);
    expect(slotsForRule(rule(1, '09:00', '10:00', 30))).toHaveLength(2);
    expect(slotsForRule(rule(1, '09:00', '10:30', 45))).toHaveLength(2);
    expect(slotsForRule(rule(1, '09:00', '10:00', 60))).toHaveLength(1);
  });
});

describe('buildWeekPreview', () => {
  it('devuelve siempre 7 días, aunque no haya reglas', () => {
    const days = buildWeekPreview([], [], WEEK_START);

    expect(days).toHaveLength(7);
    expect(countSlots(days)).toBe(0);
  });

  it('ubica los turnos en el día de la semana correcto', () => {
    const days = buildWeekPreview([rule(3, '09:00', '10:00', 30)], [], WEEK_START);

    const miercoles = days.find((d) => d.weekday === 3);
    expect(miercoles?.date).toBe('2026-09-02');
    expect(miercoles?.slots).toEqual(['09:00', '09:30']);
    // Los demás días quedan vacíos.
    expect(countSlots(days)).toBe(2);
  });

  it('junta turno mañana y turno tarde del mismo día, ordenados', () => {
    const days = buildWeekPreview(
      [rule(2, '16:00', '17:00', 60), rule(2, '09:00', '10:00', 60)],
      [],
      WEEK_START,
    );

    const martes = days.find((d) => d.weekday === 2);
    expect(martes?.slots).toEqual(['09:00', '16:00']);
  });

  it('un bloqueo de día completo deja el día sin turnos', () => {
    const days = buildWeekPreview(
      [rule(3, '09:00', '12:00', 30)],
      [block('2026-09-02')],
      WEEK_START,
    );

    const miercoles = days.find((d) => d.weekday === 3);
    expect(miercoles?.fullyBlocked).toBe(true);
    expect(miercoles?.slots).toEqual([]);
  });

  it('un bloqueo por franja saca solo los turnos que se pisan', () => {
    const days = buildWeekPreview(
      [rule(3, '09:00', '12:00', 60)], // 09, 10, 11
      [block('2026-09-02', '10:00', '11:00')],
      WEEK_START,
    );

    const miercoles = days.find((d) => d.weekday === 3);
    expect(miercoles?.slots).toEqual(['09:00', '11:00']);
    expect(miercoles?.blockedSlots).toBe(1);
    expect(miercoles?.fullyBlocked).toBe(false);
  });

  it('un turno que arranca antes del bloqueo pero lo invade también se cae', () => {
    // Turno 09:30-10:30 con bloqueo 10:00-11:00: se solapan media hora.
    const days = buildWeekPreview(
      [rule(3, '09:30', '11:30', 60)], // 09:30, 10:30
      [block('2026-09-02', '10:00', '11:00')],
      WEEK_START,
    );

    const miercoles = days.find((d) => d.weekday === 3);
    expect(miercoles?.slots).toEqual([]);
    expect(miercoles?.blockedSlots).toBe(2);
  });

  it('un bloqueo que termina justo cuando arranca el turno no lo saca', () => {
    const days = buildWeekPreview(
      [rule(3, '10:00', '11:00', 60)],
      [block('2026-09-02', '09:00', '10:00')],
      WEEK_START,
    );

    expect(days.find((d) => d.weekday === 3)?.slots).toEqual(['10:00']);
  });

  it('ignora bloqueos de otra fecha aunque sea el mismo día de la semana', () => {
    const days = buildWeekPreview(
      [rule(3, '09:00', '10:00', 30)],
      [block('2026-09-09')], // el miércoles SIGUIENTE
      WEEK_START,
    );

    expect(days.find((d) => d.weekday === 3)?.slots).toHaveLength(2);
  });

  it('arma una semana completa realista', () => {
    const rules = [
      rule(1, '09:00', '13:00', 30), // lunes mañana → 8
      rule(1, '16:00', '20:00', 30), // lunes tarde → 8
      rule(3, '09:00', '12:00', 60), // miércoles → 3
      rule(5, '08:00', '10:00', 15), // viernes → 8
    ];

    const days = buildWeekPreview(rules, [], WEEK_START);

    expect(countSlots(days)).toBe(27);
    expect(days.filter((d) => d.slots.length > 0)).toHaveLength(3);
  });
});
