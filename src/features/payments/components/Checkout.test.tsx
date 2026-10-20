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

/** Responde por URL: la sesión y el pago son requests distintos. */
function renderCheckout(
  appointment: Appointment,
  { pago = json(LINK), aviso }: { pago?: Response; aviso?: CheckoutNotice } = {},
) {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) =>
    Promise.resolve(String(input).includes('/payment') ? pago : json(SESION)),
  );
  const redirigir = vi.fn();

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/turnos/a1/pago']}>
        <Routes>
          <Route
            path="/turnos/:id/pago"
            element={<Checkout appointment={appointment} aviso={aviso} redirigir={redirigir} />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return { redirigir };
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

describe('Checkout (ENG-63)', () => {
  it('muestra el importe del turno en el botón de pago', async () => {
    renderCheckout(turno());

    expect(await screen.findByRole('button', { name: /pagar \$\s?12\.000/i })).toBeVisible();
  });

  it('pagar pide el link al backend y manda al paciente a MercadoPago', async () => {
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
    expect(screen.getByRole('button', { name: /te llevamos a mercadopago/i })).toBeDisabled();
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
