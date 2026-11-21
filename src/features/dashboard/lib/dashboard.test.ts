import { describe, expect, it } from 'vitest';
import {
  completedCount,
  currentOrNextAppointment,
  dayLabel,
  nextAppointment,
  nextPhrase,
  patientTasks,
  professionalTasks,
  recentCounterparts,
  upcomingAgenda,
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

  it('cuenta los completados', () => {
    expect(completedCount(turnos)).toBe(1);
  });
});

/** ENG-207 — los próximos turnos del profesional en el panel. */
describe('upcomingAgenda', () => {
  // AHORA es el jueves 3 de septiembre a las 09:00 en Argentina.
  const en = (id: string, date: string, hora: string, extra: Partial<Appointment> = {}) =>
    turno({
      id,
      date,
      startTime: hora,
      scheduledAt: `${date}T${hora}:00-03:00`,
      status: 'CONFIRMADO',
      ...extra,
    });

  it('resume hoy, mañana y los 7 días y agrupa la lista por día, sin repetir la tarjeta', () => {
    const turnos = [
      en('manana', '2026-09-04', '10:00'),
      en('hoy-2', '2026-09-03', '15:00', { status: 'RESERVADO_SIN_PAGAR' }),
      en('hoy-1', '2026-09-03', '11:00'),
      en('sabado', '2026-09-05', '09:30'),
      en('ultimo-dia', '2026-09-09', '18:00'),
      en('afuera', '2026-09-10', '09:00'),
      en('cancelado', '2026-09-03', '12:00', { status: 'CANCELADO' }),
    ];

    const agenda = upcomingAgenda(turnos, AHORA, 'hoy-1');

    expect(agenda.counts).toEqual({ today: 2, tomorrow: 1, week: 5 });
    expect(agenda.days.map((d) => [d.label, d.appointments.map((a) => a.id)])).toEqual([
      ['Hoy', ['hoy-2']],
      ['Mañana', ['manana']],
      ['sábado 5 de septiembre', ['sabado']],
      ['miércoles 9 de septiembre', ['ultimo-dia']],
    ]);
    expect(agenda.later).toBe(1);
  });

  it('una consulta empezada sigue en la lista hasta que se cierra la sala', () => {
    // 08:40 + 30 min + 15 de tolerancia = 09:25: a las 09:00 sigue abierta.
    const empezada = en('empezada', '2026-09-03', '08:40');
    // 08:00 + 45 = 08:45: ya cerró.
    const cerrada = en('cerrada', '2026-09-03', '08:00');

    const agenda = upcomingAgenda([empezada, cerrada], AHORA);
    expect(agenda.days.flatMap((d) => d.appointments.map((a) => a.id))).toEqual(['empezada']);
    expect(agenda.counts.today).toBe(1);
  });

  it('el turno de la tarjeta, si es de más adelante, no se cuenta como "más adelante"', () => {
    const agenda = upcomingAgenda([en('lejos', '2026-09-20', '10:00')], AHORA, 'lejos');
    expect(agenda).toMatchObject({ counts: { week: 0 }, days: [], later: 0 });
  });

  it('separa los que esperan que el paciente elija, por plazo, sin los vencidos', () => {
    const esperando = (id: string, plazo: string) =>
      en(id, '2026-09-04', '10:00', { status: 'A_REPROGRAMAR', reprogramDeadline: plazo });
    const agenda = upcomingAgenda(
      [
        esperando('despues', '2026-09-05T12:00:00Z'),
        esperando('antes', '2026-09-04T12:00:00Z'),
        esperando('vencido', '2026-09-03T11:00:00Z'),
      ],
      AHORA,
    );

    expect(agenda.awaitingPatient.map((a) => a.id)).toEqual(['antes', 'despues']);
    // No ocupan agenda: no se cuentan en el resumen.
    expect(agenda.counts.week).toBe(0);
  });

  it('"Hoy" es el día argentino aunque en UTC ya sea mañana', () => {
    // 23:30 del 3 en Argentina = 02:30 del 4 en UTC.
    const noche = new Date('2026-09-04T02:30:00Z');
    expect(dayLabel('2026-09-03', '2026-09-03')).toBe('Hoy');
    const agenda = upcomingAgenda([en('a', '2026-09-04', '10:00')], noche);
    expect(agenda.days[0].label).toBe('Mañana');
  });
});

describe('currentOrNextAppointment (ENG-207)', () => {
  it('la consulta en curso manda sobre la próxima', () => {
    const enCurso = turno({
      id: 'en-curso',
      scheduledAt: '2026-09-03T11:50:00Z',
      status: 'CONFIRMADO',
    });
    const proxima = turno({ id: 'proxima', scheduledAt: '2026-09-03T14:00:00Z' });

    expect(nextAppointment([enCurso, proxima], AHORA)?.id).toBe('proxima');
    expect(currentOrNextAppointment([enCurso, proxima], AHORA)?.id).toBe('en-curso');
    expect(nextPhrase(enCurso, 'Juan Paciente', AHORA)).toBe(
      'Tu consulta de las 09:00 con Juan Paciente está en curso.',
    );
  });

  it('sin consulta en curso es la próxima', () => {
    const proxima = turno({ id: 'proxima', scheduledAt: '2026-09-03T14:00:00Z' });
    expect(currentOrNextAppointment([proxima], AHORA)?.id).toBe('proxima');
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
  const agenda = {
    rules: [{ weekday: 2, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 }],
    blocks: [],
  };

  it('un perfil completo y validado no tiene pendientes', () => {
    expect(professionalTasks(PERFIL_PRO, agenda)).toEqual([]);
  });

  it('la matrícula pendiente es bloqueante y no ofrece adónde ir', () => {
    const [tarea] = professionalTasks(
      { ...PERFIL_PRO, status: 'PENDIENTE_VALIDACION_MATRICULA' },
      agenda,
    );

    expect(tarea.severity).toBe('blocker');
    // No depende del profesional: la valida el equipo de MediConnect.
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

    expect(tareas.map((t) => t.severity)).toEqual(['blocker', 'warning', 'warning']);
  });

  it('mientras la agenda no cargó no la reporta como vacía', () => {
    // Sin esto el panel acusaría "agenda vacía" en cada carga, antes de saberlo.
    expect(professionalTasks(PERFIL_PRO, undefined)).toEqual([]);
  });
});

describe('nextPhrase', () => {
  it('sin turno lo dice', () => {
    expect(nextPhrase(null)).toBe('No tenés consultas agendadas.');
  });

  it('con el día de la semana, y con quién si se pasa', () => {
    const t = turno({ id: 'a', date: '2026-11-10', startTime: '10:00' });
    expect(nextPhrase(t)).toBe('Tu próxima consulta es el martes 10 de noviembre a las 10:00.');
    expect(nextPhrase(t, 'Julián Sosa')).toBe(
      'Tu próxima consulta es el martes 10 de noviembre a las 10:00, con Julián Sosa.',
    );
  });

  it('el día de la semana no se corre en el cambio de año', () => {
    expect(nextPhrase(turno({ id: 'a', date: '2026-12-31', startTime: '23:30' }))).toMatch(
      /^Tu próxima consulta es el jueves 31 de diciembre/,
    );
    expect(nextPhrase(turno({ id: 'b', date: '2027-01-01', startTime: '00:00' }))).toMatch(
      /^Tu próxima consulta es el viernes 1 de enero/,
    );
  });
});

describe('recentCounterparts', () => {
  const ana = { id: 'ana', firstName: 'Ana', lastName: 'García' };
  const luis = { id: 'luis', firstName: 'Luis', lastName: 'Paz' };

  it('solo consultas completadas y pasadas, la más reciente primero y sin repetir', () => {
    const lista = [
      turno({
        id: '1',
        status: 'COMPLETADO',
        scheduledAt: '2026-08-01T12:00:00Z',
        date: '2026-08-01',
        professional: ana,
      }),
      turno({
        id: '2',
        status: 'COMPLETADO',
        scheduledAt: '2026-08-20T12:00:00Z',
        date: '2026-08-20',
        professional: ana,
      }),
      turno({
        id: '3',
        status: 'COMPLETADO',
        scheduledAt: '2026-08-10T12:00:00Z',
        date: '2026-08-10',
        professional: luis,
      }),
      turno({
        id: '4',
        status: 'CANCELADO',
        scheduledAt: '2026-08-25T12:00:00Z',
        professional: luis,
      }),
      turno({
        id: '5',
        status: 'COMPLETADO',
        scheduledAt: '2026-09-10T12:00:00Z',
        professional: luis,
      }),
    ];

    expect(recentCounterparts(lista, AHORA, (a) => a.professional)).toEqual([
      { party: ana, lastDate: '2026-08-20' },
      { party: luis, lastDate: '2026-08-10' },
    ]);
  });
});

describe('patientTasks con turnos a reprogramar (ENG-204)', () => {
  it('pide elegir por cada turno que canceló el profesional, aunque el perfil esté completo', () => {
    const perfil = { completed: true } as PatientProfile;
    const tareas = patientTasks(perfil, [
      turno({
        id: 'a',
        status: 'A_REPROGRAMAR',
        date: '2026-09-10',
        professional: { id: 'pro', firstName: 'Ana', lastName: 'Pérez' },
      }),
      turno({ id: 'b', status: 'CONFIRMADO' }),
    ]);

    expect(tareas).toEqual([
      expect.objectContaining({
        id: 'reprogramar-a',
        title: 'Ana Pérez canceló tu turno del 10 de septiembre',
        to: '/turnos/a',
        cta: 'Elegir',
      }),
    ]);
  });

  it('sin turnos a reprogramar y con el perfil completo no pide nada', () => {
    expect(patientTasks({ completed: true } as PatientProfile, [turno({ id: 'b' })])).toEqual([]);
  });
});
