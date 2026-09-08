// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PaymentPage } from './PaymentPage';
import type { Appointment } from '../features/appointments/types/appointment';

/**
 * La pantalla de pago (ENG-63).
 *
 * El cobro simulado ya está cubierto por `Checkout.test.tsx`. Lo que se prueba
 * acá es lo que sabe SOLO esta página: resolver el turno del `:appointmentId` de
 * la URL contra `GET /appointments/me`, que es lo que decide si se muestra el
 * checkout o un mensaje. Es también la puerta por la que entra un enlace ajeno o
 * viejo.
 */

const PATIENT_ID = '11111111-1111-4111-8111-111111111111';

/** Lunes 17/08/2026, 08:00 en Argentina. El reloj se congela porque el turno de
 *  prueba tiene fecha fija: con la hora real, el mismo turno pasa a ser "ya
 *  pasó" el día que alguien corra la suite después de esa fecha. */
const NOW = new Date('2026-08-17T11:00:00Z');

function turno(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'a1',
    scheduledAt: '2026-08-20T13:00:00Z',
    date: '2026-08-20',
    startTime: '10:00',
    durationMinutes: 30,
    price: 12000,
    currency: 'ARS',
    status: 'RESERVADO_SIN_PAGAR',
    professional: { id: 'p1', firstName: 'Ana', lastName: 'Médica' },
    patient: { id: PATIENT_ID, firstName: 'Juan', lastName: 'Paciente' },
    ...overrides,
  };
}

const SESION = {
  id: PATIENT_ID,
  email: 'paciente@test.com',
  role: 'PACIENTE',
  firstName: 'Juan',
  lastName: 'Paciente',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Responde por URL: la sesión y los turnos son requests distintos, y la página
 *  ramifica según cómo salga el de turnos. */
function renderPage(
  turnos: Appointment[] | { error: string },
  urlId = 'a1',
) {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input);
    if (url.includes('/appointments/me')) {
      return Promise.resolve(
        Array.isArray(turnos) ? json(turnos) : json({ message: turnos.error }, 500),
      );
    }
    return Promise.resolve(json(SESION));
  });

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/turnos/${urlId}/pago`]}>
        <Routes>
          <Route path="/turnos/:appointmentId/pago" element={<PaymentPage />} />
        </Routes>
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
  cleanup();
  vi.restoreAllMocks();
});

describe('PaymentPage (ENG-63)', () => {
  it('muestra el checkout del turno que dice la URL', async () => {
    renderPage([turno({ id: 'otro' }), turno()]);

    // El importe sale del turno resuelto, no del primero de la lista.
    expect(await screen.findByRole('button', { name: /pagar \$\s?12\.000/i })).toBeVisible();
  });

  /** Un enlace de otra cuenta, o de un turno cancelado hace rato: el turno no
   *  aparece en `/appointments/me` y la pantalla lo explica en vez de quedar en
   *  blanco o romper. */
  it('si el turno no es tuyo o no existe, lo dice', async () => {
    renderPage([turno()], 'de-otra-persona');

    expect(await screen.findByText(/no encontramos ese turno entre los tuyos/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: /pagar/i })).not.toBeInTheDocument();
  });

  it('muestra el mensaje del backend si no se pueden cargar los turnos', async () => {
    renderPage({ error: 'Se cayó el servidor.' });

    // `useMyAppointments` reintenta una vez ante un 5xx (no ante un 4xx), y con
    // el reloj congelado ese reintento no llega solo: hay que correr el tiempo.
    await vi.advanceTimersByTimeAsync(3000);

    expect(await screen.findByRole('alert')).toHaveTextContent(/se cayó el servidor/i);
  });

  /** Mientras carga no se decide nada: sin esto, la lista vacía inicial haría
   *  aparecer "no encontramos ese turno" por un instante en cada carga. */
  it('mientras carga no dice que el turno no existe', () => {
    renderPage([turno()]);

    expect(screen.getByRole('status')).toHaveTextContent(/cargando el turno/i);
    expect(screen.queryByText(/no encontramos ese turno/i)).not.toBeInTheDocument();
  });
});
