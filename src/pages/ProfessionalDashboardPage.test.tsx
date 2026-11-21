// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfessionalDashboardPage } from './ProfessionalDashboardPage';
import {
  jsonResponse,
  mockApi,
  NOW,
  PATIENT_ID,
  PRO_SESSION,
  renderWithRouter,
  UPCOMING,
} from '../features/appointments/testing/appointmentsMock';

type Fetch = typeof globalThis.fetch;

/** Un turno del paciente de prueba en hora argentina. */
const turno = (id: string, date: string, hora: string, extra: Record<string, unknown> = {}) => ({
  ...UPCOMING,
  id,
  date,
  startTime: hora,
  scheduledAt: new Date(`${date}T${hora}:00-03:00`).toISOString(),
  status: 'CONFIRMADO',
  ...extra,
});

describe('Panel del profesional', () => {
  let api: ReturnType<typeof mockApi>;
  let resto: (...args: Parameters<Fetch>) => ReturnType<Fetch>;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
    api = mockApi({
      session: () => jsonResponse(PRO_SESSION),
      mine: () => jsonResponse([UPCOMING]),
    });
    // El perfil y la agenda propios no hacen a estos casos: sin ellos el panel
    // no lista tareas pendientes. Van antes que "/me", que también los matchea.
    const base = api.getMockImplementation()!;
    resto = (input, init) =>
      String(input).includes('/professionals/me')
        ? Promise.resolve(jsonResponse({}, 404))
        : base(input, init);
    api.mockImplementation(resto);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('el turno sin pagar no le ofrece pagarlo y tiene la historia clínica a un clic', async () => {
    renderWithRouter(<ProfessionalDashboardPage />);

    const seccion = await screen.findByRole('region', { name: 'Próximos turnos' });
    expect(within(seccion).getByRole('link', { name: 'Ver historia clínica' })).toHaveAttribute(
      'href',
      `/pacientes/${PATIENT_ID}/historia-clinica`,
    );
    expect(screen.queryByRole('link', { name: /Pagar/ })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /Tu próxima consulta es el martes 18 de agosto a las 10:00, con Juan Paciente/,
      ),
    ).toBeInTheDocument();
  });

  describe('próximos turnos (ENG-207)', () => {
    const conTurnos = (lista: unknown[]) =>
      api.mockImplementation((input, init) =>
        String(input).includes('/appointments/me')
          ? Promise.resolve(jsonResponse(lista))
          : resto(input, init),
      );

    it('pestañas con la cantidad de hoy, mañana y 7 días, y la próxima resaltada', async () => {
      // NOW: lunes 17/08 a las 08:00.
      conTurnos([
        turno('hoy-1', '2026-08-17', '09:00'),
        turno('hoy-2', '2026-08-17', '11:30', { status: 'RESERVADO_SIN_PAGAR' }),
        turno('man-1', '2026-08-18', '10:00'),
        turno('jue-1', '2026-08-20', '15:00'),
        turno('lejos', '2026-09-01', '10:00'),
      ]);
      renderWithRouter(<ProfessionalDashboardPage />);

      const seccion = await screen.findByRole('region', { name: 'Próximos turnos' });
      const pestanas = within(seccion).getAllByRole('tab');
      expect(pestanas.map((t) => t.textContent)).toEqual(['2Hoy', '1Mañana', '47 días']);
      // Abre en Hoy porque hay turnos hoy.
      expect(pestanas[0]).toHaveAttribute('aria-selected', 'true');

      const hoy = within(seccion).getByRole('tabpanel');
      const filas = within(hoy).getAllByRole('listitem');
      expect(filas).toHaveLength(2);
      // La próxima va resaltada, con la historia clínica.
      expect(filas[0]).toHaveTextContent('Próximo · Videoconsulta · 30 min');
      expect(
        within(filas[0]).getByRole('link', { name: 'Ver historia clínica' }),
      ).toBeInTheDocument();
      const segunda = within(filas[1]).getByRole('link', { name: /11:30.*Juan Paciente/ });
      expect(segunda).toHaveAttribute('href', '/turnos/hoy-2');
      expect(segunda).toHaveTextContent('Sin pagar');

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      await user.click(pestanas[2]);
      const semana = within(seccion).getByRole('tabpanel');
      expect(within(semana).getByRole('list', { name: 'Mañana' })).toHaveTextContent('Pagado');
      expect(within(semana).getByRole('list', { name: 'jueves 20 de agosto' })).toBeInTheDocument();
      expect(within(seccion).getByText(/Y 1 turno más adelante/)).toBeInTheDocument();
    });

    it('sin turnos hoy abre en Mañana', async () => {
      conTurnos([turno('man-1', '2026-08-18', '10:00')]);
      renderWithRouter(<ProfessionalDashboardPage />);

      const tab = await screen.findByRole('tab', { selected: true });
      expect(tab).toHaveTextContent('Mañana');
    });

    it('con muchos turnos muestra los primeros y deja ver el resto', async () => {
      const horas = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30'];
      conTurnos(horas.map((h, i) => turno(`t-${i}`, '2026-08-18', h)));
      renderWithRouter(<ProfessionalDashboardPage />);

      const seccion = await screen.findByRole('region', { name: 'Próximos turnos' });
      const panel = within(seccion).getByRole('tabpanel');
      expect(within(panel).getAllByRole('listitem')).toHaveLength(6);

      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      await user.click(within(seccion).getByRole('button', { name: 'Mostrar 2 turnos más' }));
      expect(within(panel).getAllByRole('listitem')).toHaveLength(8);
      expect(within(seccion).getByRole('button', { name: 'Mostrar menos' })).toHaveAttribute(
        'aria-expanded',
        'true',
      );
    });

    it('la consulta en curso va resaltada y con la sala abierta ofrece entrar', async () => {
      // 07:55 + 30 min: a las 08:00 está en curso. La de las 08:05 ya abrió la sala.
      conTurnos([
        turno('en-curso', '2026-08-17', '07:55'),
        turno('siguiente', '2026-08-17', '08:05'),
      ]);
      renderWithRouter(<ProfessionalDashboardPage />);

      const seccion = await screen.findByRole('region', { name: 'Próximos turnos' });
      const [enCurso, siguiente] = within(seccion).getAllByRole('listitem');
      expect(enCurso).toHaveTextContent('En curso · Videoconsulta');
      expect(within(enCurso).getByRole('link', { name: /^Entrar/ })).toHaveAttribute(
        'href',
        '/turnos/en-curso/videoconsulta',
      );
      expect(within(siguiente).getByRole('link', { name: /^Entrar/ })).toHaveAttribute(
        'href',
        '/turnos/siguiente/videoconsulta',
      );
      expect(
        screen.getByText(/Tu consulta de las 07:55 con Juan Paciente está en curso/),
      ).toBeInTheDocument();
    });

    it('si el próximo es de después de la semana, lo muestra igual', async () => {
      conTurnos([turno('lejos', '2026-09-01', '10:00')]);
      renderWithRouter(<ProfessionalDashboardPage />);

      const tab = await screen.findByRole('tab', { selected: true });
      expect(tab).toHaveTextContent('07 días');
      expect(screen.getByText('No tenés turnos en los próximos 7 días.')).toBeInTheDocument();
      expect(
        within(screen.getByRole('list', { name: 'Tu próximo turno' })).getByRole('link', {
          name: /Juan Paciente/,
        }),
      ).toHaveAttribute('href', '/turnos/lejos');
    });

    it('distingue los turnos que esperan que el paciente elija otro horario', async () => {
      conTurnos([
        turno('a-elegir', '2026-08-17', '15:00', {
          status: 'A_REPROGRAMAR',
          cancelledBy: 'PROFESIONAL',
          reprogramDeadline: '2026-08-19T12:00:00.000Z',
        }),
      ]);
      renderWithRouter(<ProfessionalDashboardPage />);

      const lista = await screen.findByRole('list', { name: 'Esperando al paciente' });
      const fila = within(lista).getByRole('link', { name: /Juan Paciente/ });
      expect(fila).toHaveAttribute('href', '/turnos/a-elegir');
      expect(fila).toHaveTextContent('hasta el 19 de agosto · 09:00');
      expect(fila).toHaveTextContent('A reprogramar');
      // No ocupa agenda: la semana queda vacía y lo dice.
      expect(screen.getByText('No tenés turnos en los próximos 7 días.')).toBeInTheDocument();
    });
  });

  it('sin turnos ofrece revisar la agenda y el perfil, sin pestañas vacías', async () => {
    api.mockImplementation((input, init) =>
      String(input).includes('/appointments/me')
        ? Promise.resolve(jsonResponse([]))
        : resto(input, init),
    );
    renderWithRouter(<ProfessionalDashboardPage />);

    expect(await screen.findByText('Todavía no te reservaron turnos.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mi agenda' })).toHaveAttribute(
      'href',
      '/profesional/agenda',
    );
    expect(screen.getByRole('link', { name: 'Ver mi perfil público' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('"Mi actividad" reemplaza a "Tu semana" con los números del backend', async () => {
    api.mockImplementation((input, init) =>
      String(input).includes('/professionals/me/stats')
        ? Promise.resolve(
            jsonResponse({
              from: '2026-06-01',
              to: '2026-08-31',
              turnos: { completados: 5, noAsistio: 0, cancelados: 1, liberados: 0, porVenir: 1 },
              tasas: {
                cancelacion: { porcentaje: 16.7, numerador: 1, denominador: 6 },
                ausentismo: { porcentaje: 0, numerador: 0, denominador: 5 },
              },
              consultasPorMes: [
                { mes: '2026-06', consultas: 1 },
                { mes: '2026-07', consultas: 2 },
                { mes: '2026-08', consultas: 2 },
              ],
              pacientes: { unicos: 4, recurrentes: 1 },
              resenas: { promedio: 4.5, cantidad: 2, sinResponder: 0 },
            }),
          )
        : resto(input, init),
    );
    renderWithRouter(<ProfessionalDashboardPage />);

    const actividad = await screen.findByRole('region', { name: 'Mi actividad' });
    expect(await within(actividad).findByText('16,7 %')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Tu semana' })).not.toBeInTheDocument();
    expect(screen.queryByText('Publicados')).not.toBeInTheDocument();
  });
});
