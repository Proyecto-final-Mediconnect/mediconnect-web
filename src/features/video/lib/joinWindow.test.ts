import { describe, expect, it } from 'vitest';
import type { Appointment } from '../../appointments/types/appointment';
import { canJoin, joinStateOf, joinWindowFor, timeUntilOpen } from './joinWindow';

/**
 * La ventana de ingreso es el criterio de aceptación de ENG-56, así que se prueba
 * en los bordes exactos: un minuto de más o de menos es la diferencia entre que
 * el paciente vea el botón o no lo vea.
 */

const SCHEDULED_AT = '2026-08-27T15:00:00.000Z';

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'a1',
    scheduledAt: SCHEDULED_AT,
    date: '2026-08-27',
    startTime: '12:00',
    durationMinutes: 30,
    price: 15000,
    currency: 'ARS',
    status: 'RESERVADO_SIN_PAGAR',
    professional: { id: 'p1', firstName: 'Ana', lastName: 'Gómez' },
    patient: { id: 'q1', firstName: 'Luis', lastName: 'Pérez' },
    ...overrides,
  };
}

describe('joinWindowFor', () => {
  it('abre 10 minutos antes y cierra al final del turno más la tolerancia', () => {
    const { opensAt, closesAt } = joinWindowFor(appointment());

    expect(opensAt.toISOString()).toBe('2026-08-27T14:50:00.000Z');
    // 15:00 + 30 de turno + 15 de tolerancia.
    expect(closesAt.toISOString()).toBe('2026-08-27T15:45:00.000Z');
  });

  it('la ventana se estira con la duración del turno', () => {
    const corto = joinWindowFor(appointment({ durationMinutes: 15 })).closesAt.getTime();
    const largo = joinWindowFor(appointment({ durationMinutes: 60 })).closesAt.getTime();

    expect(largo - corto).toBe(45 * 60_000);
  });
});

describe('joinStateOf', () => {
  it('11 minutos antes todavía no se puede entrar', () => {
    const state = joinStateOf(appointment(), new Date('2026-08-27T14:49:00.000Z'));

    expect(state.kind).toBe('TOO_EARLY');
    expect(state).toMatchObject({ opensAt: new Date('2026-08-27T14:50:00.000Z') });
  });

  it('justo a los 10 minutos antes se abre', () => {
    expect(joinStateOf(appointment(), new Date('2026-08-27T14:50:00.000Z')).kind).toBe('OPEN');
  });

  it('sigue abierta durante el turno', () => {
    expect(joinStateOf(appointment(), new Date('2026-08-27T15:20:00.000Z')).kind).toBe('OPEN');
  });

  it('sigue abierta dentro de la tolerancia posterior', () => {
    // Una consulta que se estira diez minutos es normal; cortarla en el minuto
    // exacto sería peor que el problema que evita.
    expect(joinStateOf(appointment(), new Date('2026-08-27T15:44:00.000Z')).kind).toBe('OPEN');
  });

  it('pasada la tolerancia se cierra', () => {
    expect(joinStateOf(appointment(), new Date('2026-08-27T15:46:00.000Z')).kind).toBe('CLOSED');
  });

  it.each(['CANCELADO', 'LIBERADO', 'COMPLETADO', 'NO_ASISTIO'])(
    'un turno en %s no tiene videoconsulta ni en horario',
    (status) => {
      const state = joinStateOf(
        appointment({ status }),
        new Date('2026-08-27T15:00:00.000Z'),
      );

      expect(state.kind).toBe('NOT_APPLICABLE');
    },
  );

  it('un turno CONFIRMADO sí la tiene', () => {
    const state = joinStateOf(
      appointment({ status: 'CONFIRMADO' }),
      new Date('2026-08-27T15:00:00.000Z'),
    );

    expect(state.kind).toBe('OPEN');
  });
});

describe('canJoin', () => {
  it('resume el estado en un booleano', () => {
    expect(canJoin(appointment(), new Date('2026-08-27T15:00:00.000Z'))).toBe(true);
    expect(canJoin(appointment(), new Date('2026-08-27T10:00:00.000Z'))).toBe(false);
  });
});

describe('timeUntilOpen', () => {
  const opensAt = new Date('2026-08-27T14:50:00.000Z');

  it('redondea hacia arriba para no decir "0 minutos"', () => {
    // A 90 segundos faltan dos minutos, no uno: el usuario está mirando la
    // pantalla esperando que aparezca el botón.
    expect(timeUntilOpen(opensAt, new Date('2026-08-27T14:48:30.000Z'))).toBe('en 2 minutos');
  });

  it('en el último minuto no da un número', () => {
    expect(timeUntilOpen(opensAt, new Date('2026-08-27T14:49:30.000Z'))).toBe(
      'en menos de un minuto',
    );
  });

  it('usa horas cuando corresponde', () => {
    expect(timeUntilOpen(opensAt, new Date('2026-08-27T13:50:00.000Z'))).toBe('en una hora');
    expect(timeUntilOpen(opensAt, new Date('2026-08-27T11:50:00.000Z'))).toBe('en 3 horas');
  });

  it('usa días para turnos lejanos', () => {
    expect(timeUntilOpen(opensAt, new Date('2026-08-26T14:50:00.000Z'))).toBe('mañana');
    expect(timeUntilOpen(opensAt, new Date('2026-08-24T14:50:00.000Z'))).toBe('en 3 días');
  });
});
