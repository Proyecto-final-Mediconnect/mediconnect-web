// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
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

  it('el turno sin pagar no le ofrece pagarlo y el botón principal es la historia clínica', async () => {
    renderWithRouter(<ProfessionalDashboardPage />);

    expect(await screen.findByRole('link', { name: 'Ver historia clínica' })).toHaveAttribute(
      'href',
      `/pacientes/${PATIENT_ID}/historia-clinica`,
    );
    expect(screen.getByRole('link', { name: 'Ver el detalle' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Pagar la consulta' })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /Tu próxima consulta es el martes 18 de agosto a las 10:00, con Juan Paciente/,
      ),
    ).toBeInTheDocument();
  });

  it('la fila de los próximos siete días abre la historia clínica del paciente', async () => {
    renderWithRouter(<ProfessionalDashboardPage />);

    const semana = await screen.findByRole('region', { name: 'Los próximos siete días' });
    expect(within(semana).getByRole('link', { name: /Juan Paciente/ })).toHaveAttribute(
      'href',
      `/pacientes/${PATIENT_ID}/historia-clinica`,
    );
  });

  it('sin turnos ofrece revisar la agenda y el perfil, y no muestra la semana', async () => {
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
    expect(
      screen.queryByRole('region', { name: 'Los próximos siete días' }),
    ).not.toBeInTheDocument();
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
