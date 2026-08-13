// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { WeeklyScheduleForm } from './WeeklyScheduleForm';

/** Agenda inicial: martes de 09:00 a 13:00 con turnos de 30 min → 8 turnos. */
const SCHEDULE = {
  rules: [
    {
      id: 'r1',
      weekday: 2,
      startTime: '09:00',
      endTime: '13:00',
      slotDurationMinutes: 30,
    },
  ],
  blocks: [],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Cuerpos enviados en cada PUT, para afirmar qué se guarda. */
let putBodies: unknown[] = [];

/**
 * `saved` es lo que devuelve el GET (con lo que se siembra el formulario);
 * `afterSave` lo que devuelve el PUT. Tienen que poder diferir: un test que
 * empieza con agenda cargada y la vacía necesita que el GET traiga las franjas y
 * el PUT devuelva la agenda ya vacía.
 */
function mockFetch(saved: unknown = SCHEDULE, afterSave: unknown = saved) {
  putBodies = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    if (url.endsWith('/professionals/me/schedule')) {
      if (init?.method === 'PUT') {
        putBodies.push(JSON.parse(String(init.body)));
        return Promise.resolve(jsonResponse(afterSave));
      }
      return Promise.resolve(jsonResponse(saved));
    }
    return Promise.resolve(jsonResponse({}, 404));
  });
}

function renderForm() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <WeeklyScheduleForm />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** La sección de vista previa, para no confundir sus horas con las del form. */
function preview() {
  return screen.getByRole('region', { name: /vista previa/i });
}

beforeEach(() => {
  // La preview se ancla a "hoy": con el reloj real, el test pasaría o no según
  // el día en que se corra. Miércoles 2 de septiembre de 2026, 12:00 local.
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(2026, 8, 2, 12, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  cleanup();
});

describe('WeeklyScheduleForm (ENG-53)', () => {
  it('siembra el formulario con la agenda guardada', async () => {
    mockFetch();
    renderForm();

    const martes = await screen.findByRole('checkbox', { name: /martes/i });
    expect(martes).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /lunes/i })).not.toBeChecked();
  });

  it('muestra la vista previa de la agenda guardada', async () => {
    mockFetch();
    renderForm();

    await screen.findByRole('checkbox', { name: /martes/i });

    // 09:00 a 13:00 en turnos de 30 min = 8 turnos.
    expect(within(preview()).getByText(/8 turnos/i)).toBeInTheDocument();
  });

  it('la vista previa refleja los cambios ANTES de guardar', async () => {
    // Es el 5º criterio de aceptación: "vista previa de la agenda generada antes
    // de guardar". Si la preview saliera del servidor, esto no podría pasar.
    mockFetch();
    const user = userEvent.setup();
    renderForm();

    await screen.findByRole('checkbox', { name: /martes/i });
    expect(within(preview()).getByText(/8 turnos/i)).toBeInTheDocument();

    // Se activa el lunes (agrega 09:00-13:00 de 30 min → 8 turnos más).
    await user.click(screen.getByRole('checkbox', { name: /lunes/i }));

    await waitFor(() =>
      expect(within(preview()).getByText(/16 turnos/i)).toBeInTheDocument(),
    );
    // Sin haber tocado "Guardar": nada viajó al backend.
    expect(putBodies).toHaveLength(0);
  });

  it('"Agregar franja" continúa después de la última, sin pisarla', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderForm();

    await screen.findByRole('checkbox', { name: /martes/i });
    await user.click(screen.getByRole('button', { name: /agregar franja/i }));

    // La franja nueva arranca a las 13:00, donde termina la de la mañana, así
    // que se puede guardar sin tocar nada más.
    await user.click(screen.getByRole('button', { name: /guardar agenda/i }));

    await waitFor(() => expect(putBodies).toHaveLength(1));
    expect(putBodies[0]).toEqual({
      rules: [
        {
          weekday: 2,
          startTime: '09:00',
          endTime: '13:00',
          slotDurationMinutes: 30,
        },
        {
          weekday: 2,
          startTime: '13:00',
          endTime: '17:00',
          slotDurationMinutes: 30,
        },
      ],
    });
  });

  it('rechaza franjas superpuestas y no manda nada al backend', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderForm();

    await screen.findByRole('checkbox', { name: /martes/i });
    await user.click(screen.getByRole('button', { name: /agregar franja/i }));

    // Se pisa a mano la hora de inicio de la segunda franja para solapar.
    const desde = screen.getAllByLabelText(/desde/i);
    await user.clear(desde[1]);
    await user.type(desde[1], '11:00');

    await user.click(screen.getByRole('button', { name: /guardar agenda/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/superponen/i);
    expect(putBodies).toHaveLength(0);
  });

  it('un borrado de bloqueo que falla muestra el error en pantalla', async () => {
    // Antes el delete no tenía onError: la fila quedaba ahí y el usuario no se
    // enteraba de nada.
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = String(input);
      if (url.includes('/schedule/blocks/') && init?.method === 'DELETE') {
        return Promise.resolve(
          jsonResponse({ message: 'No se pudo borrar el bloqueo.' }, 500),
        );
      }
      if (url.endsWith('/professionals/me/schedule')) {
        return Promise.resolve(
          jsonResponse({
            rules: [],
            blocks: [
              {
                id: 'b1',
                blockDate: '2026-09-08',
                startTime: null,
                endTime: null,
                reason: null,
              },
            ],
          }),
        );
      }
      return Promise.resolve(jsonResponse({}, 404));
    });

    const user = userEvent.setup();
    renderForm();

    await user.click(await screen.findByRole('button', { name: /quitar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /no se pudo borrar/i,
    );
  });

  it('no manda el id de las franjas guardadas (el backend rechaza campos desconocidos)', async () => {
    mockFetch();
    const user = userEvent.setup();
    renderForm();

    await screen.findByRole('checkbox', { name: /martes/i });
    await user.click(screen.getByRole('button', { name: /guardar agenda/i }));

    await waitFor(() => expect(putBodies).toHaveLength(1));
    expect(putBodies[0]).toEqual({
      rules: [
        {
          weekday: 2,
          startTime: '09:00',
          endTime: '13:00',
          slotDurationMinutes: 30,
        },
      ],
    });
  });

  it('desactivar todos los días guarda una agenda vacía', async () => {
    // Arranca con el martes cargado (GET) y el PUT devuelve la agenda ya vacía.
    mockFetch(SCHEDULE, { rules: [], blocks: [] });
    const user = userEvent.setup();
    renderForm();

    const martes = await screen.findByRole('checkbox', { name: /martes/i });
    await user.click(martes);

    expect(within(preview()).getByText(/no se genera ningún turno/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /guardar agenda/i }));

    await waitFor(() => expect(putBodies).toHaveLength(1));
    expect(putBodies[0]).toEqual({ rules: [] });
  });

  it('un bloqueo de día completo deja ese día sin turnos en la preview', async () => {
    mockFetch({
      rules: SCHEDULE.rules,
      blocks: [
        {
          id: 'b1',
          blockDate: '2026-09-08', // el martes que viene
          startTime: null,
          endTime: null,
          reason: 'Congreso',
        },
      ],
    });
    const user = userEvent.setup();
    renderForm();

    await screen.findByRole('checkbox', { name: /martes/i });
    // Esta semana el martes sigue con sus 8 turnos.
    expect(within(preview()).getByText(/8 turnos/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /semana siguiente/i }));

    await waitFor(() =>
      expect(
        within(preview()).getByText(/no se genera ningún turno/i),
      ).toBeInTheDocument(),
    );
    expect(within(preview()).getByText(/bloqueado/i)).toBeInTheDocument();
  });
});
