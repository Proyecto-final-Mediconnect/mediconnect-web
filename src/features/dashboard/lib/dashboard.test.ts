import { describe, expect, it } from 'vitest';
import {
  completedCount,
  nextAppointment,
  patientTasks,
  professionalTasks,
  upcomingCount,
  withinNextWeek,
} from './dashboard';
import type { Appointment } from '../../appointments/types/appointment';
import type { PatientProfile } from '../../patient-profile/types/patientProfile';
import type { ProfessionalProfile } from '../../profile/types/professionalProfile';

const AHORA = new Date('2026-09-03T12:00:00Z');

function turno(overrides: Partial<Appointment> & { id: string }): Appointment {
  return {
    scheduledAt: '2026-09-04T12:00:00Z',
    date: '2026-09-04',
    startTime: '09:00',
    durationMinutes: 30,
    price: 12000,
    currency: 'ARS',
    status: 'RESERVADO_SIN_PAGAR',
    professional: null,
    patient: null,
    ...overrides,
  };
}

const PERFIL_PRO: ProfessionalProfile = {
  profileId: 'p1',
  firstName: 'Valeria',
  lastName: 'Ocampo',
  licenseNumber: 'MP-1234',
  bio: 'Clínica general.',
  photoUrl: null,
  consultationPrice: 12000,
  currency: 'ARS',
  status: 'VALIDADO',
  specialties: [{ id: 's1', name: 'Clínica médica' }],
};

describe('nextAppointment', () => {
  it('devuelve el más cercano en el futuro, sin importar el orden de llegada', () => {
    const lejos = turno({ id: 'a', scheduledAt: '2026-09-20T12:00:00Z' });
    const cerca = turno({ id: 'b', scheduledAt: '2026-09-05T12:00:00Z' });

    expect(nextAppointment([lejos, cerca], AHORA)?.id).toBe('b');
  });

  it('ignora los cancelados aunque sean los más cercanos', () => {
    // En "Mis turnos" un cancelado de mañana se sigue mostrando; acá no es "tu
    // próxima consulta", porque no va a haber consulta.
    const cancelado = turno({
      id: 'a',
      scheduledAt: '2026-09-04T12:00:00Z',
      status: 'CANCELADO',
    });
    const vigente = turno({ id: 'b', scheduledAt: '2026-09-10T12:00:00Z' });

    expect(nextAppointment([cancelado, vigente], AHORA)?.id).toBe('b');
  });

  it('ignora los que ya pasaron', () => {
    const pasado = turno({ id: 'a', scheduledAt: '2026-09-01T12:00:00Z' });

    expect(nextAppointment([pasado], AHORA)).toBeNull();
  });

  it('sin turnos devuelve null', () => {
    expect(nextAppointment([], AHORA)).toBeNull();
  });
});

describe('contadores', () => {
  const turnos = [
    turno({ id: 'a', scheduledAt: '2026-09-05T12:00:00Z' }),
    turno({ id: 'b', scheduledAt: '2026-09-25T12:00:00Z' }),
    turno({ id: 'c', scheduledAt: '2026-09-06T12:00:00Z', status: 'CANCELADO' }),
    turno({ id: 'd', scheduledAt: '2026-08-01T12:00:00Z', status: 'COMPLETADO' }),
  ];

  it('cuenta los vigentes futuros', () => {
    expect(upcomingCount(turnos, AHORA)).toBe(2);
  });

  it('cuenta los completados', () => {
    expect(completedCount(turnos)).toBe(1);
  });

  it('la semana toma 7 días exactos, no el mes', () => {
    // El del 25 queda afuera; el cancelado del 6 también.
    expect(withinNextWeek(turnos, AHORA).map((t) => t.id)).toEqual(['a']);
  });
});

describe('patientTasks', () => {
  it('con el perfil incompleto pide completarlo, y lo marca como bloqueante', () => {
    const perfil = { completed: false } as PatientProfile;
    const [tarea] = patientTasks(perfil);

    expect(tarea.severity).toBe('blocker');
    expect(tarea.to).toBe('/perfil/paciente');
  });

  it('con el perfil completo no pide nada', () => {
    expect(patientTasks({ completed: true } as PatientProfile)).toEqual([]);
  });

  it('mientras el perfil no cargó no inventa tareas', () => {
    expect(patientTasks(undefined)).toEqual([]);
  });
});

describe('professionalTasks', () => {
  const agenda = { rules: [{ weekday: 2, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 }], blocks: [] };

  it('un perfil completo y validado no tiene pendientes', () => {
    expect(professionalTasks(PERFIL_PRO, agenda)).toEqual([]);
  });

  it('la matrícula pendiente es bloqueante y no ofrece adónde ir', () => {
    const [tarea] = professionalTasks(
      { ...PERFIL_PRO, status: 'PENDIENTE_VALIDACION_MATRICULA' },
      agenda,
    );

    expect(tarea.severity).toBe('blocker');
    // No depende del profesional: la valida un moderador.
    expect(tarea.to).toBeNull();
  });

  it('sin precio y sin agenda, las dos cosas son bloqueantes', () => {
    const tareas = professionalTasks(
      { ...PERFIL_PRO, consultationPrice: null },
      { rules: [], blocks: [] },
    );

    expect(tareas.map((t) => t.id)).toEqual(['precio', 'agenda']);
    expect(tareas.every((t) => t.severity === 'blocker')).toBe(true);
  });

  it('la bio vacía avisa, pero no bloquea nada', () => {
    const [tarea] = professionalTasks({ ...PERFIL_PRO, bio: '   ' }, agenda);

    expect(tarea.id).toBe('bio');
    expect(tarea.severity).toBe('warning');
  });

  it('los bloqueantes van antes que los avisos', () => {
    const tareas = professionalTasks(
      { ...PERFIL_PRO, consultationPrice: null, bio: null, specialties: [] },
      agenda,
    );

    expect(tareas.map((t) => t.severity)).toEqual([
      'blocker',
      'warning',
      'warning',
    ]);
  });

  it('mientras la agenda no cargó no la reporta como vacía', () => {
    // Sin esto el panel acusaría "agenda vacía" en cada carga, antes de saberlo.
    expect(professionalTasks(PERFIL_PRO, undefined)).toEqual([]);
  });
});
