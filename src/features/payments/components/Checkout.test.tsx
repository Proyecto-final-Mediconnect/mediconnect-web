// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Checkout, type CheckoutNotice } from './Checkout';
import type { Appointment } from '../../appointments/types/appointment';

const PATIENT_ID = '11111111-1111-4111-8111-111111111111';

/** Lunes 17/08/2026, 08:00 locales. */
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

const LINK = {
  appointmentId: 'a1',
  checkoutUrl: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=123',
  sandbox: true,
  amount: 12000,
  currency: 'ARS',
  status: 'PENDIENTE',
};

/** Una pestaña abierta con `window.open`, para ver adónde la mandan. */
function pestanaFalsa() {
  return { closed: false, location: { href: '' }, close: vi.fn() } as unknown as Window & {
    close: ReturnType<typeof vi.fn>;
  };
}

/**
 * Responde por URL y método: la sesión, el link (`POST`) y el estado del pago
 * (`GET`) son requests distintos. Sin `pestana`, el navegador "bloquea" la
 * pestaña nueva y se paga en la misma, como antes de ENG-199.
 */
function renderCheckout(
  appointment: Appointment,
  {
    pago = json(LINK),
    estado = json({
      appointmentId: 'a1',
      status: 'PENDIENTE',
      appointmentStatus: 'RESERVADO_SIN_PAGAR',
    }),
    aviso,
    pestana = null,
  }: {
    pago?: Response;
    estado?: Response | (() => Response);
    aviso?: CheckoutNotice;
    pestana?: Window | null;
  } = {},
) {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    if (!String(input).includes('/payment')) return Promise.resolve(json(SESION));
    if (init?.method === 'POST') return Promise.resolve(pago);
    return Promise.resolve(typeof estado === 'function' ? estado() : estado.clone());
  });
  const redirigir = vi.fn();
  const abrirPestana = vi.fn(() => pestana);

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/turnos/a1/pago']}>
        <Routes>
          <Route
            path="/turnos/:id/pago"
            element={
              <Checkout
                appointment={appointment}
                aviso={aviso}
                redirigir={redirigir}
                abrirPestana={abrirPestana}
              />
            }
          />
          <Route path="/turnos/:id/confirmado" element={<h1>Turno confirmado</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return { redirigir, abrirPestana };
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
  cleanup();
});

describe('Checkout (ENG-63)', () => {
  it('muestra el importe del turno en el botón de pago', async () => {
    renderCheckout(turno());

    expect(await screen.findByRole('button', { name: /pagar \$\s?12\.000/i })).toBeVisible();
  });

  it('pagar abre MercadoPago en otra pestaña y esta se queda esperando (ENG-199)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const pestana = pestanaFalsa();
    const { redirigir, abrirPestana } = renderCheckout(turno(), { pestana });

    await user.click(screen.getByRole('button', { name: /pagar/i }));

    // La pestaña se abre en el mismo click, antes de tener el link.
    expect(abrirPestana).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole('heading', {
        name: /completá el pago en la pestaña de mercadopago/i,
      }),
    ).toBeVisible();
    expect(pestana.location.href).toBe(LINK.checkoutUrl);
    expect(redirigir).not.toHaveBeenCalled();
    expect(localStorage.getItem('mediconnect:pago-en-pestana:a1')).not.toBeNull();
  });

  it('mientras espera, pasa sola a la confirmación cuando el webhook confirma el turno', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let confirmado = false;
    renderCheckout(turno(), {
      pestana: pestanaFalsa(),
      estado: () =>
        json({
          appointmentId: 'a1',
          status: confirmado ? 'APROBADO' : 'PENDIENTE',
          appointmentStatus: confirmado ? 'CONFIRMADO' : 'RESERVADO_SIN_PAGAR',
        }),
    });

    await user.click(screen.getByRole('button', { name: /pagar/i }));
    await screen.findByRole('heading', { name: /completá el pago/i });

    confirmado = true;
    await vi.advanceTimersByTimeAsync(2_500);

    expect(await screen.findByRole('heading', { name: 'Turno confirmado' })).toBeVisible();
  });

  it('si no puede iniciar el pago, cierra la pestaña que abrió', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const pestana = pestanaFalsa();
    renderCheckout(turno(), { pestana, pago: json({ message: 'No disponible.' }, 503) });

    await user.click(screen.getByRole('button', { name: /pagar/i }));

    await waitFor(() => expect(pestana.close).toHaveBeenCalled());
    expect(screen.getByRole('button', { name: /reintentar el pago/i })).toBeEnabled();
  });

  it('con la pestaña bloqueada, pide el link y paga en esta pestaña', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { redirigir } = renderCheckout(turno());

    await user.click(screen.getByRole('button', { name: /pagar/i }));

    await waitFor(() => expect(redirigir).toHaveBeenCalledWith(LINK.checkoutUrl));
    const pedido = vi
      .mocked(globalThis.fetch)
      .mock.calls.find(([input]) => String(input).includes('/payment'));
    expect(String(pedido?.[0])).toMatch(/\/appointments\/a1\/payment$/);
    expect(pedido?.[1]?.method).toBe('POST');
    // Mientras el navegador se va, no se puede pedir otro checkout.
    expect(screen.getByRole('button', { name: /abriendo mercadopago/i })).toBeDisabled();
  });

  it('si el backend no puede iniciar el pago, muestra su mensaje y deja reintentar', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { redirigir } = renderCheckout(turno(), {
      pago: json(
        { message: 'Los pagos no están disponibles en este momento. Probá de nuevo más tarde.' },
        503,
      ),
    });

    await user.click(screen.getByRole('button', { name: /pagar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no están disponibles/i);
    expect(screen.getByRole('button', { name: /reintentar el pago/i })).toBeEnabled();
    expect(redirigir).not.toHaveBeenCalled();
  });

  it('no pide datos de tarjeta: el PCI queda del lado de MercadoPago (ADR-013)', () => {
    renderCheckout(turno());

    // Ningún campo de entrada en toda la pantalla de pago.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('después de un rechazo lo dice y ofrece reintentar', async () => {
    renderCheckout(turno(), { aviso: 'RECHAZADO' });

    expect(await screen.findByRole('alert')).toHaveTextContent(/rechazó el pago/i);
    expect(screen.getByRole('button', { name: /reintentar el pago/i })).toBeVisible();
  });

  it('un turno ya confirmado no se vuelve a cobrar', () => {
    renderCheckout(turno({ status: 'CONFIRMADO' }));

    expect(screen.getByText(/ya está confirmado/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: /pagar/i })).not.toBeInTheDocument();
  });

  it('un turno cancelado explica por qué no se puede pagar', () => {
    renderCheckout(turno({ status: 'CANCELADO' }));

    expect(screen.getByText(/está cancelado/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: /pagar/i })).not.toBeInTheDocument();
  });
});
