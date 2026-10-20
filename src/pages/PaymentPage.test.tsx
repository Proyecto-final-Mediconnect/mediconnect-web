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
 * El botón de pago ya está cubierto por `Checkout.test.tsx`. Lo que se prueba
 * acá es lo que sabe SOLO esta página: resolver el turno del `:appointmentId` de
 * la URL contra `GET /appointments/me`, y la vuelta desde MercadoPago
 * (`?resultado=…`), que espera la confirmación del webhook en vez de creerle a la
 * URL.
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

/** Lo que va devolviendo `GET /appointments/:id/payment`, uno por consulta. El
 *  último se repite: así se simula el webhook llegando entre dos consultas. */
type Pago = { status: string; appointmentStatus: string };

/** Responde por URL: la sesión, los turnos y el estado del pago son requests
 *  distintos, y la página ramifica según cómo salga cada uno. */
function renderPage(
  turnos: Appointment[] | { error: string },
  urlId = 'a1',
  { query = '', pagos = [] }: { query?: string; pagos?: Pago[] } = {},
) {
  let consulta = 0;
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input);
    if (url.includes('/appointments/me')) {
      return Promise.resolve(
        Array.isArray(turnos) ? json(turnos) : json({ message: turnos.error }, 500),
      );
    }
    if (url.includes('/payment')) {
      const pago = pagos[Math.min(consulta, pagos.length - 1)];
      consulta += 1;
      return Promise.resolve(json({ appointmentId: urlId, ...pago }));
    }
    return Promise.resolve(json(SESION));
  });

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/turnos/${urlId}/pago${query}`]}>
        <Routes>
          <Route path="/turnos/:appointmentId/pago" element={<PaymentPage />} />
          <Route
            path="/turnos/:appointmentId/confirmado"
            element={<p>Pantalla de confirmación</p>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const PENDIENTE = { status: 'PENDIENTE', appointmentStatus: 'RESERVADO_SIN_PAGAR' };
const CONFIRMADO = { status: 'APROBADO', appointmentStatus: 'CONFIRMADO' };

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

  describe('vuelta desde MercadoPago', () => {
    it('con resultado=exito espera el webhook y pasa a la confirmación cuando llega', async () => {
      renderPage([turno()], 'a1', { query: '?resultado=exito', pagos: [PENDIENTE, CONFIRMADO] });

      // Volver con "éxito" no confirma nada: primero se espera al webhook.
      expect(await screen.findByText(/esperando la confirmación de mercadopago/i)).toBeVisible();

      await vi.advanceTimersByTimeAsync(2_500);

      expect(await screen.findByText(/pantalla de confirmación/i)).toBeVisible();
    });

    it('si el pago se rechazó, lo dice y ofrece reintentar', async () => {
      renderPage([turno()], 'a1', {
        query: '?resultado=fallo',
        pagos: [{ status: 'RECHAZADO', appointmentStatus: 'RESERVADO_SIN_PAGAR' }],
      });

      expect(await screen.findByRole('alert')).toHaveTextContent(/rechazó el pago/i);
      expect(screen.getByRole('button', { name: /reintentar el pago/i })).toBeVisible();
    });

    // Rechazado, reintentó y pagó bien: vuelve con "exito" antes del webhook del
    // pago nuevo, así que el backend todavía muestra el RECHAZADO del intento
    // anterior. Mostrarlo lo invitaría a pagar dos veces.
    it('con resultado=exito un RECHAZADO del intento anterior no se muestra: sigue esperando', async () => {
      renderPage([turno()], 'a1', {
        query: '?resultado=exito',
        pagos: [{ status: 'RECHAZADO', appointmentStatus: 'RESERVADO_SIN_PAGAR' }, CONFIRMADO],
      });

      expect(await screen.findByText(/esperando la confirmación de mercadopago/i)).toBeVisible();
      expect(screen.queryByRole('button', { name: /reintentar el pago/i })).not.toBeInTheDocument();

      await vi.advanceTimersByTimeAsync(2_500);

      expect(await screen.findByText(/pantalla de confirmación/i)).toBeVisible();
    });

    it('con resultado=fallo vuelve a ofrecer el pago sin quedarse esperando', async () => {
      renderPage([turno()], 'a1', { query: '?resultado=fallo', pagos: [PENDIENTE] });

      expect(await screen.findByRole('alert')).toHaveTextContent(/no se completó/i);
      expect(screen.getByRole('button', { name: /reintentar el pago/i })).toBeVisible();
    });

    it('con resultado=pendiente explica que se confirma al acreditarse', async () => {
      renderPage([turno()], 'a1', { query: '?resultado=pendiente', pagos: [PENDIENTE] });

      expect(await screen.findByText(/tu pago quedó pendiente/i)).toBeVisible();
    });

    // El job de ENG-101 liberó el turno mientras el paciente estaba en
    // MercadoPago. "Mis turnos" todavía lo tiene cacheado como reservado, pero
    // el estado del pago dice la verdad. Antes esto caía en "Esperando la
    // confirmación…" durante un minuto y después prometía que el turno se
    // confirmaba solo.
    it('si el turno se liberó por falta de pago, lo dice en vez de esperar', async () => {
      renderPage([turno()], 'a1', {
        query: '?resultado=exito',
        pagos: [{ status: 'PENDIENTE', appointmentStatus: 'LIBERADO' }],
      });

      expect(await screen.findByText(/se liberó porque no se pagó a tiempo/i)).toBeVisible();
      expect(
        screen.queryByText(/esperando la confirmación de mercadopago/i),
      ).not.toBeInTheDocument();
    });

    it('deja de preguntar al minuto y ofrece volver a consultar', async () => {
      renderPage([turno()], 'a1', { query: '?resultado=exito', pagos: [PENDIENTE] });
      await screen.findByText(/esperando la confirmación de mercadopago/i);

      await vi.advanceTimersByTimeAsync(61_000);

      expect(await screen.findByRole('button', { name: /volver a consultar/i })).toBeVisible();
      const consultas = () =>
        vi.mocked(globalThis.fetch).mock.calls.filter(([i]) => String(i).includes('/payment'))
          .length;
      const antes = consultas();
      await vi.advanceTimersByTimeAsync(10_000);
      expect(consultas()).toBe(antes);
    });

    it('un resultado inventado en la URL se ignora y muestra el checkout', async () => {
      renderPage([turno()], 'a1', { query: '?resultado=aprobadisimo' });

      expect(await screen.findByRole('button', { name: /pagar \$\s?12\.000/i })).toBeVisible();
    });
  });
});
