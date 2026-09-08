// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Los turnos llevan enlaces (videoconsulta, pago): sin Router, `Link` explota.
import { MemoryRouter } from 'react-router-dom';
import { BookAppointment } from './BookAppointment';
import { MAX_PAGE } from '../lib/weeks';

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
      <MemoryRouter>
        <BookAppointment professionalId={PRO_ID} />
      </MemoryRouter>
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

  it('no deja retroceder antes de hoy ni pasar el horizonte publicado', async () => {
    mockApi();
    renderBooking();

    const back = await screen.findByRole('button', { name: /siete días antes/i });
    const forward = screen.getByRole('button', { name: /siete días después/i });

    expect(back).toBeDisabled();

    // Con dos meses de horizonte son nueve páginas: ocho clicks hasta el final.
    // Que sean ocho es justamente lo que justifica el selector de mes.
    for (let i = 0; i < MAX_PAGE; i++) await userEvent.click(forward);

    expect(forward).toBeDisabled();
    expect(back).toBeEnabled();
  });

  /**
   * Antes cada flecha disparaba una consulta nueva. Ahora se piden los 28 días de
   * una sola vez y la paginación es local: además de evitar una espera por
   * página, es lo que permite saber dónde está el primer día con lugar sin
   * haberlo pedido antes.
   */
  it('pide el horizonte completo una sola vez y pagina sin volver al backend', async () => {
    const fetchMock = mockApi();
    renderBooking();

    await screen.findByText('Ana Médica');
    const antes = fetchMock.mock.calls.filter(([input]) =>
      String(input).includes('/availability'),
    ).length;

    await userEvent.click(screen.getByRole('button', { name: /siete días después/i }));
    await userEvent.click(screen.getByRole('button', { name: /siete días después/i }));

    const despues = fetchMock.mock.calls.filter(([input]) =>
      String(input).includes('/availability'),
    ).length;
    expect(despues).toBe(antes);
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

  it('avisa cuando esos días no tienen horarios publicados', async () => {
    mockApi({
      availability: () =>
        jsonResponse({
          ...AVAILABILITY,
          days: AVAILABILITY.days.map((day) => ({ ...day, slots: [] })),
        }),
    });
    renderBooking();

    expect(await screen.findByText(/no publicó horarios para estos días/i)).toBeInTheDocument();
  });

  /**
   * Lo que se reportó: "cuando elijo reservar me muestra días con turnos no
   * disponibles o viejos". Pasaban las dos cosas — el calendario abría siempre el
   * primer día de la ventana, sin mirar si había algo que reservar ahí.
   */
  describe('primer día disponible', () => {
    /** Día con horarios pero ninguno libre: el caso que el criterio viejo abría
     *  igual, porque solo miraba que hubiera horarios. */
    const lleno = (date: string, weekday: number) => ({
      date,
      weekday,
      fullyBlocked: false,
      slots: [
        { startTime: '09:00', durationMinutes: 30, status: 'PAST' },
        { startTime: '09:30', durationMinutes: 30, status: 'BOOKED' },
      ],
    });

    const conLugar = (date: string, weekday: number) => ({
      date,
      weekday,
      fullyBlocked: false,
      slots: [{ startTime: '11:00', durationMinutes: 30, status: 'AVAILABLE' }],
    });

    it('abre el primer día con lugar, no el primero de la ventana', async () => {
      mockApi({
        availability: () =>
          jsonResponse({
            ...AVAILABILITY,
            days: [
              lleno('2026-08-17', 1),
              lleno('2026-08-18', 2),
              conLugar('2026-08-19', 3),
            ],
          }),
      });
      renderBooking();

      // `level: 3` porque el encabezado del rango (h2) también nombra ese día:
      // el rótulo ahora sale de los días visibles, así que dice "al 19 de agosto".
      expect(
        await screen.findByRole('heading', { level: 3, name: /19 de agosto/i }),
      ).toBeVisible();
    });

    /** El salto también cambia de página: si el primer día con lugar cae en la
     *  tercera semana, el paciente no tiene que ir tocando la flecha hasta
     *  encontrarlo. */
    it('salta a la página donde está ese día', async () => {
      const dias = Array.from({ length: 21 }, (_, i) => {
        const date = `2026-08-${String(17 + i).padStart(2, '0')}`;
        return i === 16 ? conLugar(date, 1) : lleno(date, 1);
      });

      mockApi({ availability: () => jsonResponse({ ...AVAILABILITY, days: dias }) });
      renderBooking();

      // El día 16 cae en la página 2 (índices 14 a 20).
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /siete días antes/i })).toBeEnabled(),
      );
    });

    it('si no hay lugar en ningún lado se queda en el principio', async () => {
      mockApi({
        availability: () =>
          jsonResponse({
            ...AVAILABILITY,
            days: [lleno('2026-08-17', 1), lleno('2026-08-18', 2)],
          }),
      });
      renderBooking();

      await screen.findByText('Ana Médica');
      expect(screen.getByRole('button', { name: /siete días antes/i })).toBeDisabled();
    });
  });

  /**
   * Con dos meses de horizonte son nueve páginas de siete días. Recorrerlas de a
   * una es incómodo, y en el camino nunca se ve más de una semana: el calendario
   * del mes muestra treinta días juntos, con el lugar de cada uno a la vista.
   */
  describe('calendario del mes', () => {
    const libre = (date: string, weekday: number) => ({
      date,
      weekday,
      fullyBlocked: false,
      slots: [{ startTime: '11:00', durationMinutes: 30, status: 'AVAILABLE' }],
    });

    const lleno = (date: string, weekday: number) => ({
      date,
      weekday,
      fullyBlocked: false,
      slots: [{ startTime: '11:00', durationMinutes: 30, status: 'BOOKED' }],
    });

    /** 40 días desde el 20/08: cruzan a septiembre y llegan al 28. El 25/08 va
     *  completo, para poder comprobar que un día sin lugar no se puede elegir. */
    const DIAS_LARGOS = Array.from({ length: 40 }, (_, i) => {
      const d = new Date(Date.UTC(2026, 7, 20 + i));
      const date = d.toISOString().slice(0, 10);
      return date === '2026-08-25'
        ? lleno(date, d.getUTCDay())
        : libre(date, d.getUTCDay());
    });

    const conAgendaLarga = () =>
      mockApi({
        availability: () => jsonResponse({ ...AVAILABILITY, days: DIAS_LARGOS }),
      });

    async function abrirCalendario() {
      await userEvent.click(await screen.findByRole('button', { name: /ver calendario/i }));
    }

    /** La mayoría de las reservas son para los próximos días: el calendario
     *  arranca plegado para no competir con la grilla de horarios. */
    it('arranca plegado', async () => {
      conAgendaLarga();
      renderBooking();

      const boton = await screen.findByRole('button', { name: /ver calendario/i });
      expect(boton).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByRole('button', { name: /mes siguiente/i })).not.toBeInTheDocument();
    });

    it('al desplegarlo muestra el mes entero, no una semana', async () => {
      conAgendaLarga();
      renderBooking();
      await abrirCalendario();

      // Agosto tiene 31 días; el 20 y el 31 son los extremos de lo publicado.
      expect(screen.getByRole('button', { name: /^20 —/ })).toBeVisible();
      expect(screen.getByRole('button', { name: /^31 —/ })).toBeVisible();
    });

    it('elegir un día lo abre y cierra el calendario', async () => {
      conAgendaLarga();
      renderBooking();
      await abrirCalendario();

      await userEvent.click(screen.getByRole('button', { name: /^28 —/ }));

      expect(
        screen.getByRole('heading', { level: 3, name: /28 de agosto/i }),
      ).toBeVisible();
      expect(screen.getByRole('button', { name: /ver calendario/i })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    });

    /** El salto cruza de página sola: el 15/09 está a cuatro páginas de distancia
     *  del 20/08, y con las flechas serían cuatro clicks. */
    it('salta a un día de otro mes sin pasar por las flechas', async () => {
      conAgendaLarga();
      renderBooking();
      await abrirCalendario();

      await userEvent.click(screen.getByRole('button', { name: /mes siguiente/i }));
      await userEvent.click(screen.getByRole('button', { name: /^15 —/ }));

      expect(
        screen.getByRole('heading', { level: 3, name: /15 de septiembre/i }),
      ).toBeVisible();
    });

    it('un día sin horarios libres no se puede elegir', async () => {
      conAgendaLarga();
      renderBooking();
      await abrirCalendario();

      expect(screen.getByRole('button', { name: /^25 — sin horarios libres/ })).toBeDisabled();
    });

    /** El mes asoma días que el backend todavía no publicó: agosto empieza el 1
     *  y la ventana arranca el 20. */
    it('los días fuera del horizonte quedan apagados', async () => {
      conAgendaLarga();
      renderBooking();
      await abrirCalendario();

      expect(
        screen.getByRole('button', { name: /^19 — fuera del período/ }),
      ).toBeDisabled();
    });

    it('no deja retroceder antes del primer mes ni pasar el último', async () => {
      conAgendaLarga();
      renderBooking();
      await abrirCalendario();

      expect(screen.getByRole('button', { name: /mes anterior/i })).toBeDisabled();
      await userEvent.click(screen.getByRole('button', { name: /mes siguiente/i }));
      expect(screen.getByRole('button', { name: /mes siguiente/i })).toBeDisabled();
    });
  });

  it('muestra el error si la disponibilidad no se puede cargar', async () => {
    mockApi({
      availability: () => jsonResponse({ message: 'No encontramos a ese profesional.' }, 404),
    });
    renderBooking();

    expect(await screen.findByRole('alert')).toHaveTextContent(/no encontramos a ese profesional/i);
  });
});
