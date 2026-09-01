// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { MyAppointments } from './MyAppointments';

const PATIENT_ID = '11111111-1111-4111-8111-111111111111';
const PRO_ID = '22222222-2222-4222-8222-222222222222';

/** Lunes 17/08/2026 a las 08:00 locales. */
const NOW = new Date('2026-08-17T11:00:00Z');

const PATIENT_SESSION = {
  id: PATIENT_ID,
  email: 'paciente@test.com',
  role: 'PACIENTE',
  firstName: 'Juan',
  lastName: 'Paciente',
};

const PRO_SESSION = {
  id: PRO_ID,
  email: 'pro@test.com',
  role: 'PROFESIONAL',
  firstName: 'Ana',
  lastName: 'Médica',
};

const PARTIES = {
  professional: { id: PRO_ID, firstName: 'Ana', lastName: 'Médica' },
  patient: { id: PATIENT_ID, firstName: 'Juan', lastName: 'Paciente' },
};

/** Mañana 10:00: cancelable. */
const UPCOMING = {
  id: '33333333-3333-4333-8333-333333333333',
  scheduledAt: '2026-08-18T13:00:00.000Z',
  date: '2026-08-18',
  startTime: '10:00',
  durationMinutes: 30,
  price: 15000,
  currency: 'ARS',
  status: 'RESERVADO_SIN_PAGAR',
  ...PARTIES,
};

/** La semana pasada: ya ocurrió. */
const PAST = {
  id: '44444444-4444-4444-8444-444444444444',
  scheduledAt: '2026-08-10T13:00:00.000Z',
  date: '2026-08-10',
  startTime: '10:00',
  durationMinutes: 30,
  price: 15000,
  currency: 'ARS',
  status: 'COMPLETADO',
  ...PARTIES,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockApi(
  handlers: {
    session?: () => Response;
    mine?: () => Response;
    cancel?: () => Response;
  } = {},
) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input, init): Promise<Response> => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (method === 'PATCH' && url.includes('/cancel')) {
      return Promise.resolve(
        handlers.cancel?.() ?? jsonResponse({ ...UPCOMING, status: 'CANCELADO' }),
      );
    }
    if (url.includes('/appointments/me')) {
      return Promise.resolve(handlers.mine?.() ?? jsonResponse([PAST, UPCOMING]));
    }
    if (url.includes('/me')) {
      return Promise.resolve(handlers.session?.() ?? jsonResponse(PATIENT_SESSION));
    }
    return Promise.resolve(jsonResponse({}, 404));
  });
}

function renderMyAppointments() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // `MemoryRouter`: desde ENG-58 la fila del profesional linkea a la historia
  // clínica del paciente, y un `<Link>` fuera de un router tira.
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MyAppointments />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** La lista de una sección, para afirmar sobre "Próximos" sin tocar "Pasados". */
function section(name: RegExp) {
  return within(screen.getByRole('region', { name }));
}

describe('MyAppointments', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('separa los turnos en próximos y pasados', async () => {
    mockApi();
    renderMyAppointments();

    await screen.findByRole('region', { name: /próximos/i });

    expect(section(/próximos/i).getByText(/18 de agosto de 2026/)).toBeInTheDocument();
    expect(section(/pasados/i).getByText(/10 de agosto de 2026/)).toBeInTheDocument();
  });

  it('cada turno muestra fecha, hora, contraparte y estado', async () => {
    mockApi();
    renderMyAppointments();

    await screen.findByRole('region', { name: /próximos/i });
    const proximos = section(/próximos/i);

    expect(proximos.getByText(/18 de agosto de 2026 · 10:00/)).toBeInTheDocument();
    expect(proximos.getByText(/Profesional: Ana Médica/)).toBeInTheDocument();
    expect(proximos.getByText('Reservado (sin pagar)')).toBeInTheDocument();
    expect(proximos.getByText(/30 min/)).toBeInTheDocument();
  });

  it('el paciente ve al profesional; el profesional ve al paciente', async () => {
    mockApi({ session: () => jsonResponse(PRO_SESSION) });
    renderMyAppointments();

    await screen.findByRole('region', { name: /próximos/i });

    expect(section(/próximos/i).getByText(/Paciente: Juan Paciente/)).toBeInTheDocument();
  });

  it('cancelar pide confirmación antes de llamar a la API', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const fetchMock = mockApi();
    renderMyAppointments();

    await user.click(await screen.findByRole('button', { name: /cancelar turno/i }));

    expect(screen.getByText(/¿Cancelás el turno/)).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([, init]) => (init as RequestInit | undefined)?.method === 'PATCH',
      ),
    ).toBe(false);
  });

  it('confirmar manda el PATCH del turno elegido', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const fetchMock = mockApi();
    renderMyAppointments();

    await user.click(await screen.findByRole('button', { name: /cancelar turno/i }));
    await user.click(screen.getByRole('button', { name: /sí, cancelar/i }));

    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(
        ([, init]) => (init as RequestInit | undefined)?.method === 'PATCH',
      );
      expect(String(patch?.[0])).toContain(`/appointments/${UPCOMING.id}/cancel`);
    });
  });

  it('"No, dejarlo" cierra la confirmación sin cancelar', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const fetchMock = mockApi();
    renderMyAppointments();

    await user.click(await screen.findByRole('button', { name: /cancelar turno/i }));
    await user.click(screen.getByRole('button', { name: /no, dejarlo/i }));

    expect(screen.queryByText(/¿Cancelás el turno/)).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([, init]) => (init as RequestInit | undefined)?.method === 'PATCH',
      ),
    ).toBe(false);
  });

  it('un turno pasado no se puede cancelar', async () => {
    mockApi({ mine: () => jsonResponse([PAST]) });
    renderMyAppointments();

    await screen.findByText(/10 de agosto de 2026/);

    expect(screen.queryByRole('button', { name: /cancelar turno/i })).not.toBeInTheDocument();
  });

  it('el profesional no puede cancelar el turno de su paciente', async () => {
    // El backend devuelve 403; la pantalla ni siquiera ofrece el botón.
    mockApi({ session: () => jsonResponse(PRO_SESSION) });
    renderMyAppointments();

    await screen.findByText(/18 de agosto de 2026/);

    expect(screen.queryByRole('button', { name: /cancelar turno/i })).not.toBeInTheDocument();
  });

  it('muestra el error del backend si la cancelación falla', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockApi({
      cancel: () =>
        jsonResponse({ message: 'El turno cambió de estado mientras lo cancelabas.' }, 409),
    });
    renderMyAppointments();

    await user.click(await screen.findByRole('button', { name: /cancelar turno/i }));
    await user.click(screen.getByRole('button', { name: /sí, cancelar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/cambió de estado/i);
  });

  it('sin turnos muestra las dos secciones vacías, no un error', async () => {
    mockApi({ mine: () => jsonResponse([]) });
    renderMyAppointments();

    expect(await screen.findByText('No tenés turnos próximos.')).toBeInTheDocument();
    expect(screen.getByText('Todavía no tuviste ningún turno.')).toBeInTheDocument();
  });

  it('si la lista falla muestra el mensaje del backend', async () => {
    mockApi({ mine: () => jsonResponse({ message: 'No pudimos cargar tus turnos.' }, 500) });
    renderMyAppointments();

    // `useMyAppointments` reintenta los 5xx una vez, así que el error tarda más
    // que el timeout por defecto de `findBy`.
    expect(await screen.findByRole('alert', undefined, { timeout: 4000 })).toHaveTextContent(
      /no pudimos cargar tus turnos/i,
    );
  });
});
