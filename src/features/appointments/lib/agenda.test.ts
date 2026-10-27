import { describe, expect, it } from 'vitest';
import { agendaSections, filterAgenda, formatMonthYear, inPeriod } from './agenda';
import type { Appointment } from '../types/appointment';

const NOW = new Date('2026-10-22T15:00:00Z');

function turno(id: string, date: string, status: string, name = 'Ana Médica'): Appointment {
  const [first, last] = name.split(' ');
  return {
    id,
    scheduledAt: `${date}T13:00:00.000Z`,
    date,
    startTime: '10:00',
    durationMinutes: 30,
    price: 15000,
    currency: 'ARS',
    status,
    professional: { id: 'pro', firstName: first, lastName: last },
    patient: { id: 'pac', firstName: 'Juan', lastName: 'Paciente' },
  };
}

const pro = (a: Appointment) => a.professional;

describe('agenda (ENG-178)', () => {
  it('agrupa: próximos vigentes primero, después la historia por mes', () => {
    const secciones = agendaSections(
      [
        turno('a', '2026-10-30', 'CONFIRMADO'),
        turno('b', '2026-10-25', 'RESERVADO_SIN_PAGAR'),
        turno('c', '2026-10-28', 'CANCELADO'),
        turno('d', '2026-09-10', 'COMPLETADO'),
      ],
      NOW,
    );

    expect(secciones.map((s) => [s.title, s.data.map((d) => d.id)])).toEqual([
      ['Próximos', ['b', 'a']],
      ['Octubre 2026', ['c']],
      ['Septiembre 2026', ['d']],
    ]);
  });

  it('busca por nombre sin tildes ni mayúsculas', () => {
    const turnos = [
      turno('a', '2026-10-30', 'CONFIRMADO', 'Martín Olivares'),
      turno('b', '2026-10-30', 'CONFIRMADO'),
    ];
    expect(
      filterAgenda(turnos, { search: 'martin', period: 'todos', status: 'todos' }, pro, NOW).map(
        (t) => t.id,
      ),
    ).toEqual(['a']);
  });

  it('filtra por estado', () => {
    const turnos = [turno('a', '2026-10-30', 'CONFIRMADO'), turno('b', '2026-10-01', 'LIBERADO')];
    expect(
      filterAgenda(turnos, { search: '', period: 'todos', status: 'cancelados' }, pro, NOW).map(
        (t) => t.id,
      ),
    ).toEqual(['b']);
  });

  it.each([
    ['este-mes', '2026-10-02', true],
    ['este-mes', '2026-09-30', false],
    ['mes-pasado', '2026-09-15', true],
    ['ultimos-3-meses', '2026-08-01', true],
    ['ultimos-3-meses', '2026-07-31', false],
    ['este-anio', '2026-01-01', true],
  ] as const)('%s incluye %s: %s', (period, date, esperado) => {
    expect(inPeriod(turno('x', date, 'COMPLETADO'), period, NOW)).toBe(esperado);
  });

  it('el mes de la historia lleva el año', () => {
    expect(formatMonthYear('2026-01')).toBe('Enero 2026');
  });
});
