// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ProfessionalPatientsPage } from './ProfessionalPatientsPage';

const NOW = new Date('2026-11-14T15:00:00Z');
const SESION = {
  id: 'p1',
  email: 'pro@test.com',
  role: 'PROFESIONAL',
  firstName: 'Ana',
  lastName: 'García',
};

const PACIENTES = {
  rows: [
    {
      patientId: 'pac-1',
      firstName: 'Julián',
      lastName: 'Sosa',
      age: 32,
      firstConsultation: { at: '2026-08-30T13:00:00Z', date: '2026-08-30', startTime: '10:00' },
      lastConsultation: { at: '2026-11-12T13:00:00Z', date: '2026-11-12', startTime: '10:00' },
      nextAppointment: { at: '2026-11-20T14:00:00Z', date: '2026-11-20', startTime: '11:00' },
      consultations: 3,
    },
    {
      patientId: 'pac-2',
      firstName: 'Marina',
      lastName: 'Quiroga',
      age: null,
      firstConsultation: null,
      lastConsultation: null,
      nextAppointment: { at: '2026-12-01T12:30:00Z', date: '2026-12-01', startTime: '09:30' },
      consultations: 0,
    },
  ],
  pagina: 1,
  hayMas: false,
  total: 2,
};

const VACIO = { rows: [], pagina: 1, hayMas: false, total: 0 };

const pedidos = () =>
  vi
    .mocked(globalThis.fetch)
    .mock.calls.map(([u]) => String(u))
    .filter((u) => u.includes('/professionals/me/patients'));

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderPage(pacientes: (url: string) => Response) {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input);
    if (url.includes('/professionals/me/patients')) return Promise.resolve(pacientes(url));
    // `/appointments/me` también termina en `/me`, pero no es la sesión.
    if (url.endsWith('/me') && !url.includes('/appointments')) return Promise.resolve(json(SESION));
    if (url.includes('/notifications'))
      return Promise.resolve(json({ unreadCount: 0, notifications: [] }));
    // El shell pide otras listas (turnos, conversaciones): vacías.
    return Promise.resolve(json([]));
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ProfessionalPatientsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  cleanup();
});

describe('ProfessionalPatientsPage (ENG-197)', () => {
  it('lista sus pacientes con última consulta, próximo turno, cantidad y link a la historia', async () => {
    renderPage(() => json(PACIENTES));

    const fila = (await screen.findByText('Julián Sosa')).closest('tr') as HTMLElement;
    expect(within(fila).getByText('12 de noviembre · 10:00')).toBeVisible();
    expect(within(fila).getByText('20 de noviembre · 11:00')).toBeVisible();
    expect(within(fila).getByText('3')).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Ver historia clínica de Julián Sosa' }),
    ).toHaveAttribute('href', '/pacientes/pac-1/historia-clinica');

    const otra = screen.getByText('Marina Quiroga').closest('tr') as HTMLElement;
    expect(within(otra).getByText('Todavía no')).toBeVisible();
    expect(screen.getByText('2 pacientes')).toBeVisible();
    expect(pedidos()[0]).toMatch(
      /\/professionals\/me\/patients\?pagina=1&orden=ULTIMA_CONSULTA&dir=desc$/,
    );
  });

  it('buscar manda q al backend', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage(() => json(PACIENTES));
    await screen.findByText('Julián Sosa');

    await user.type(screen.getByRole('searchbox', { name: /buscar paciente/i }), 'julián');

    await waitFor(() =>
      expect(pedidos().some((u) => u.includes(`q=${encodeURIComponent('julián')}`))).toBe(true),
    );
    // Con debounce: no pide una vez por tecla.
    expect(pedidos().filter((u) => u.includes('q=')).length).toBe(1);
  });

  it('sin pacientes todavía, lo dice', async () => {
    renderPage(() => json(VACIO));

    expect(await screen.findByText('Todavía no atendiste pacientes')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Exportar a Excel' })).toBeDisabled();
  });

  it('si la búsqueda no encuentra a nadie, ofrece limpiarla', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage((url) => json(url.includes('q=') ? VACIO : PACIENTES));
    await screen.findByText('Julián Sosa');

    await user.type(screen.getByRole('searchbox', { name: /buscar paciente/i }), 'zz');

    expect(await screen.findByText('Ningún paciente coincide con «zz»')).toBeVisible();
    await user.click(screen.getAllByRole('button', { name: 'Limpiar filtros' }).at(-1)!);
    expect(await screen.findByText('Julián Sosa')).toBeVisible();
    expect(screen.getByRole('searchbox', { name: /buscar paciente/i })).toHaveValue('');
  });

  it('si falla, muestra el error y deja reintentar', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let falla = true;
    renderPage(() => (falla ? json({ message: 'Se cayó el servidor' }, 500) : json(PACIENTES)));

    const alerta = await screen.findByRole('alert');
    expect(within(alerta).getByRole('button', { name: 'Reintentar' })).toBeVisible();

    falla = false;
    await user.click(within(alerta).getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Julián Sosa')).toBeVisible();
  });

  it('tocar un encabezado ordena por esa columna, y de nuevo al revés', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage(() => json(PACIENTES));
    await screen.findByText('Julián Sosa');

    await user.click(screen.getByRole('button', { name: /Consultas/ }));
    await waitFor(() =>
      expect(pedidos().some((u) => u.includes('orden=CONSULTAS&dir=desc'))).toBe(true),
    );
    expect(screen.getByRole('columnheader', { name: /Consultas/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    );

    await user.click(screen.getByRole('button', { name: /Consultas/ }));
    await waitFor(() =>
      expect(pedidos().some((u) => u.includes('orden=CONSULTAS&dir=asc'))).toBe(true),
    );
  });

  it('filtra por próximo turno y por última consulta', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage(() => json(PACIENTES));
    await screen.findByText('Julián Sosa');

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Próximo turno' }),
      'SIN_PROXIMO',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Última consulta' }),
      'MAS_DE_6M',
    );

    await waitFor(() =>
      expect(
        pedidos().some((u) => u.includes('proximo=SIN_PROXIMO') && u.includes('ultima=MAS_DE_6M')),
      ).toBe(true),
    );
    expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeVisible();
  });

  it('muestra la edad y desde cuándo es paciente', async () => {
    renderPage(() => json(PACIENTES));
    expect(await screen.findByText('32 años')).toBeVisible();
    expect(screen.getByText('30 de agosto')).toBeVisible();
  });

  it('exportar baja el Excel con los mismos filtros y orden', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const crear = vi.fn(() => 'blob:csv');
    Object.assign(URL, { createObjectURL: crear, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderPage((url) =>
      url.includes('/export')
        ? new Response(new Uint8Array([0x50, 0x4b]), {
            headers: {
              'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
          })
        : json(PACIENTES),
    );
    await screen.findByText('Julián Sosa');

    await user.click(screen.getByRole('button', { name: 'Exportar a Excel' }));

    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(
      pedidos().some((u) =>
        u.endsWith('/professionals/me/patients/export?orden=ULTIMA_CONSULTA&dir=desc'),
      ),
    ).toBe(true);
    expect(crear).toHaveBeenCalled();
  });
});
