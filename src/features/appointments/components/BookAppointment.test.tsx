// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BookAppointment } from './BookAppointment';

const PRO_ID = '22222222-2222-4222-8222-222222222222';

/** Lunes 17/08/2026 a las 08:00 locales: la grilla de esa semana es estable. */
const NOW = new Date('2026-08-17T11:00:00Z');

const PROFESSIONAL = {
  id: PRO_ID,
  firstName: 'Ana',
  lastName: 'Médica',
  consultationPrice: 15000,
  currency: 'ARS',
};

/** Lunes con cuatro horarios, uno de cada estado. */
const MONDAY_DAY = {
  date: '2026-08-17',
  weekday: 1,
  fullyBlocked: false,
  slots: [
    { startTime: '09:00', durationMinutes: 30, status: 'PAST' },
    { startTime: '09:30', durationMinutes: 30, status: 'BOOKED' },
    { startTime: '10:00', durationMinutes: 30, status: 'BLOCKED' },
    { startTime: '10:30', durationMinutes: 30, status: 'AVAILABLE' },
  ],
};

const EMPTY_DAY = (date: string, weekday: number) => ({
  date,
  weekday,
  fullyBlocked: false,
  slots: [],
});

const AVAILABILITY = {
  professional: PROFESSIONAL,
  from: '2026-08-17',
  to: '2026-08-23',
  days: [
    MONDAY_DAY,
    EMPTY_DAY('2026-08-18', 2),
    EMPTY_DAY('2026-08-19', 3),
    EMPTY_DAY('2026-08-20', 4),
    EMPTY_DAY('2026-08-21', 5),
    EMPTY_DAY('2026-08-22', 6),
    EMPTY_DAY('2026-08-23', 0),
  ],
};

const BOOKED_APPOINTMENT = {
  id: '33333333-3333-4333-8333-333333333333',
  scheduledAt: '2026-08-17T13:30:00.000Z',
  date: '2026-08-17',
  startTime: '10:30',
  durationMinutes: 30,
  price: 15000,
  currency: 'ARS',
  status: 'RESERVADO_SIN_PAGAR',
  professional: { id: PRO_ID, firstName: 'Ana', lastName: 'Médica' },
  patient: { id: 'p1', firstName: 'Juan', lastName: 'Paciente' },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Enruta por path + método, que es como el componente usa la API. */
function mockApi(
  handlers: {
    availability?: () => Response;
    mine?: () => Response;
    book?: (body: unknown) => Response;
  } = {},
) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input, init): Promise<Response> => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (method === 'POST' && url.includes('/appointments')) {
      const body: unknown = JSON.parse(String(init?.body ?? '{}'));
      return Promise.resolve(handlers.book?.(body) ?? jsonResponse(BOOKED_APPOINTMENT, 201));
    }
    if (url.includes('/availability')) {
      return Promise.resolve(handlers.availability?.() ?? jsonResponse(AVAILABILITY));
    }
    if (url.includes('/appointments/me')) {
      return Promise.resolve(handlers.mine?.() ?? jsonResponse([]));
    }
    return Promise.resolve(jsonResponse({}, 404));
  });
}

function renderBooking() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BookAppointment professionalId={PRO_ID} />
    </QueryClientProvider>,
  );
}

describe('BookAppointment', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('muestra el profesional y el precio de la consulta', async () => {
    mockApi();
    renderBooking();

    expect(await screen.findByText('Ana Médica')).toBeInTheDocument();
    expect(screen.getByText(/15\.?000/)).toBeInTheDocument();
  });

  it('muestra los horarios no disponibles en vez de esconderlos', async () => {
    // El criterio de aceptación pide que disponibles, ocupados y bloqueados se
    // distingan visualmente: si se omitieran, no habría nada que distinguir.
    mockApi();
    renderBooking();

    expect(await screen.findByLabelText(/09:00 .* ya pasó/i)).toBeDisabled();
    expect(screen.getByLabelText(/09:30 .* ocupado/i)).toBeDisabled();
    expect(screen.getByLabelText(/10:00 .* bloqueado/i)).toBeDisabled();
    expect(screen.getByLabelText(/10:30 .* disponible/i)).toBeEnabled();
  });

  it('elegir un horario no reserva: primero pide confirmación', async () => {
    const fetchMock = mockApi();
    renderBooking();

    await userEvent.click(await screen.findByLabelText(/10:30 .* disponible/i));

    expect(screen.getByRole('heading', { name: /confirmar turno/i })).toBeInTheDocument();
    // Ningún POST todavía: un click en la grilla no compromete una consulta paga.
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('avisa que el turno queda reservado sin pagar', async () => {
    mockApi();
    renderBooking();

    await userEvent.click(await screen.findByLabelText(/10:30 .* disponible/i));

    expect(screen.getByText(/reservado sin pagar/i)).toBeInTheDocument();
  });

  it('al confirmar manda solo profesional, fecha y hora', async () => {
    let sent: unknown = null;
    mockApi({
      book: (body) => {
        sent = body;
        return jsonResponse(BOOKED_APPOINTMENT, 201);
      },
    });
    renderBooking();

    await userEvent.click(await screen.findByLabelText(/10:30 .* disponible/i));
    await userEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));

    await waitFor(() => {
      // El precio, la duración y el estado los decide el servidor; el backend
      // rechaza el request entero si vienen en el cuerpo.
      expect(sent).toEqual({
        professionalId: PRO_ID,
        date: '2026-08-17',
        startTime: '10:30',
      });
    });
  });

  it('confirma la reserva y la muestra en la lista del paciente', async () => {
    let booked = false;
    mockApi({
      book: () => {
        booked = true;
        return jsonResponse(BOOKED_APPOINTMENT, 201);
      },
      mine: () => jsonResponse(booked ? [BOOKED_APPOINTMENT] : []),
    });
    renderBooking();

    await userEvent.click(await screen.findByLabelText(/10:30 .* disponible/i));
    await userEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));

    expect(
      await screen.findByText(/reservamos tu turno para el 17 de agosto a las 10:30/i),
    ).toBeInTheDocument();

    const list = await screen.findByRole('region', {
      name: /tus turnos con este profesional/i,
    });
    expect(within(list).getByText(/17 de agosto/)).toBeInTheDocument();
    expect(within(list).getByText(/sin pagar/i)).toBeInTheDocument();
  });

  it('muestra el mensaje del backend si el turno se lo llevó otro', async () => {
    mockApi({
      book: () => jsonResponse({ message: 'Ese turno lo acaba de reservar otra persona.' }, 409),
    });
    renderBooking();

    await userEvent.click(await screen.findByLabelText(/10:30 .* disponible/i));
    await userEvent.click(screen.getByRole('button', { name: /confirmar reserva/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/acaba de reservar otra persona/i);
  });

  it('no deja retroceder antes de la semana actual ni pasar las 4 semanas', async () => {
    mockApi();
    renderBooking();

    const back = await screen.findByRole('button', {
      name: /semana anterior/i,
    });
    const forward = screen.getByRole('button', { name: /semana siguiente/i });

    expect(back).toBeDisabled();

    // Tres clicks llegan a la semana 3, la última navegable.
    await userEvent.click(forward);
    await userEvent.click(forward);
    await userEvent.click(forward);

    expect(forward).toBeDisabled();
    expect(back).toBeEnabled();
  });

  it('pide la semana correcta al backend al navegar', async () => {
    const fetchMock = mockApi();
    renderBooking();

    await screen.findByText('Ana Médica');
    await userEvent.click(screen.getByRole('button', { name: /semana siguiente/i }));

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([input]) => String(input));
      expect(urls.some((url) => url.includes('from=2026-08-24&to=2026-08-30'))).toBe(true);
    });
  });

  it('no deja reservar si el profesional no publicó precio', async () => {
    // `appointments.price` es NOT NULL: sin precio no hay nada que congelar.
    mockApi({
      availability: () =>
        jsonResponse({
          ...AVAILABILITY,
          professional: { ...PROFESSIONAL, consultationPrice: null },
        }),
    });
    renderBooking();

    await userEvent.click(await screen.findByLabelText(/10:30 .* disponible/i));

    expect(screen.getByRole('button', { name: /confirmar reserva/i })).toBeDisabled();
    expect(screen.getByText(/no publicó su precio/i)).toBeInTheDocument();
  });

  it('avisa cuando la semana no tiene horarios publicados', async () => {
    mockApi({
      availability: () =>
        jsonResponse({
          ...AVAILABILITY,
          days: AVAILABILITY.days.map((day) => ({ ...day, slots: [] })),
        }),
    });
    renderBooking();

    expect(await screen.findByText(/no publicó horarios de atención/i)).toBeInTheDocument();
  });

  it('muestra el error si la disponibilidad no se puede cargar', async () => {
    mockApi({
      availability: () => jsonResponse({ message: 'No encontramos a ese profesional.' }, 404),
    });
    renderBooking();

    expect(await screen.findByRole('alert')).toHaveTextContent(/no encontramos a ese profesional/i);
  });
});
