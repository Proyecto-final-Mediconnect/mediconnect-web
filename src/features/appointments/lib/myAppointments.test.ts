import { describe, expect, it } from 'vitest';
import {
  canCancel,
  counterpartOf,
  formatLongDate,
  isActive,
  splitByTime,
  statusLabel,
} from './myAppointments';
import type { Appointment } from '../types/appointment';

const PATIENT_ID = '11111111-1111-4111-8111-111111111111';
const PRO_ID = '22222222-2222-4222-8222-222222222222';

/** Lunes 17/08/2026 a las 08:00 locales. */
const NOW = new Date('2026-08-17T11:00:00Z');

function appointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'a1',
    scheduledAt: '2026-08-17T13:00:00.000Z', // 10:00 local, futuro respecto de NOW
    date: '2026-08-17',
    startTime: '10:00',
    durationMinutes: 30,
    price: 15000,
    currency: 'ARS',
    status: 'RESERVADO_SIN_PAGAR',
    professional: { id: PRO_ID, firstName: 'Ana', lastName: 'Médica' },
    patient: { id: PATIENT_ID, firstName: 'Juan', lastName: 'Paciente' },
    ...overrides,
  };
}

describe('splitByTime', () => {
  it('separa por instante: lo que todavía no pasó va a próximos', () => {
    const future = appointment({ id: 'futuro' });
    const past = appointment({
      id: 'pasado',
      scheduledAt: '2026-08-17T10:00:00.000Z',
    });

    const { upcoming, past: pastList } = splitByTime([past, future], NOW);

    expect(upcoming.map((a) => a.id)).toEqual(['futuro']);
    expect(pastList.map((a) => a.id)).toEqual(['pasado']);
  });

  it('un turno cancelado pero futuro sigue en próximos', () => {
    // Si fuera a "Pasados", el paciente no encontraría la confirmación de que
    // canceló justo donde la busca.
    const cancelled = appointment({ id: 'cancelado', status: 'CANCELADO' });

    const { upcoming, past } = splitByTime([cancelled], NOW);

    expect(upcoming).toHaveLength(1);
    expect(past).toHaveLength(0);
  });

  it('el turno que está empezando ahora mismo ya no es próximo', () => {
    const starting = appointment({ scheduledAt: NOW.toISOString() });

    expect(splitByTime([starting], NOW).past).toHaveLength(1);
  });

  it('los pasados quedan del más reciente al más viejo', () => {
    // El backend devuelve todo ascendente; en un historial se lee al revés.
    const older = appointment({ id: 'viejo', scheduledAt: '2026-01-05T13:00:00.000Z' });
    const newer = appointment({ id: 'reciente', scheduledAt: '2026-08-10T13:00:00.000Z' });

    const { past } = splitByTime([older, newer], NOW);

    expect(past.map((a) => a.id)).toEqual(['reciente', 'viejo']);
  });

  it('sin turnos devuelve las dos listas vacías', () => {
    expect(splitByTime([], NOW)).toEqual({ upcoming: [], past: [] });
  });
});

describe('canCancel', () => {
  it('el paciente puede cancelar su turno futuro y activo', () => {
    expect(canCancel(appointment(), PATIENT_ID, NOW)).toBe(true);
  });

  it('un turno confirmado también se puede cancelar', () => {
    expect(canCancel(appointment({ status: 'CONFIRMADO' }), PATIENT_ID, NOW)).toBe(true);
  });

  it('el profesional no ve el botón, aunque vea el turno', () => {
    expect(canCancel(appointment(), PRO_ID, NOW)).toBe(false);
  });

  it('un turno pasado no se cancela', () => {
    const past = appointment({ scheduledAt: '2026-08-17T10:00:00.000Z' });

    expect(canCancel(past, PATIENT_ID, NOW)).toBe(false);
  });

  it('un turno ya cancelado no se vuelve a cancelar', () => {
    expect(canCancel(appointment({ status: 'CANCELADO' }), PATIENT_ID, NOW)).toBe(false);
  });

  it('sin sesión cargada todavía no se ofrece cancelar', () => {
    expect(canCancel(appointment(), null, NOW)).toBe(false);
  });
});

describe('counterpartOf', () => {
  it('el paciente ve al profesional', () => {
    expect(counterpartOf(appointment(), PATIENT_ID)?.lastName).toBe('Médica');
  });

  it('el profesional ve al paciente', () => {
    expect(counterpartOf(appointment(), PRO_ID)?.lastName).toBe('Paciente');
  });
});

describe('statusLabel', () => {
  it('aclara que un turno reservado todavía no está pago', () => {
    expect(statusLabel('RESERVADO_SIN_PAGAR')).toBe('Reservado (sin pagar)');
  });

  it('un estado desconocido se muestra crudo en vez de romper la fila', () => {
    expect(statusLabel('ESTADO_NUEVO')).toBe('ESTADO_NUEVO');
  });
});

describe('isActive', () => {
  it('solo los estados que ocupan el horario están activos', () => {
    expect(isActive(appointment({ status: 'CONFIRMADO' }))).toBe(true);
    expect(isActive(appointment({ status: 'LIBERADO' }))).toBe(false);
    expect(isActive(appointment({ status: 'COMPLETADO' }))).toBe(false);
  });
});

describe('formatLongDate', () => {
  it('incluye el año', () => {
    expect(formatLongDate('2026-08-17')).toBe('17 de agosto de 2026');
  });
});
