// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Checkout } from './Checkout';
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

function renderCheckout(appointment: Appointment) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({
        id: PATIENT_ID,
        email: 'paciente@test.com',
        role: 'PACIENTE',
        firstName: 'Juan',
        lastName: 'Paciente',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ),
  );

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/turnos/a1/pago']}>
        <Routes>
          <Route path="/turnos/:id/pago" element={<Checkout appointment={appointment} />} />
          <Route path="/turnos/:id/confirmado" element={<p>Tu consulta quedó agendada.</p>} />
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
  vi.restoreAllMocks();
  cleanup();
});

describe('Checkout (ENG-63, pago simulado)', () => {
  it('muestra el importe del turno en el botón de pago', async () => {
    renderCheckout(turno());

    expect(
      await screen.findByRole('button', { name: /pagar \$\s?12\.000/i }),
    ).toBeVisible();
  });

  it('avisa que el pago está simulado antes de que el paciente apriete nada', () => {
    // Es la razón de ser del aviso: nadie tiene que enterarse después de pagar.
    renderCheckout(turno());

    expect(screen.getByText(/el pago todavía está simulado/i)).toBeVisible();
  });

  it('no pide datos de tarjeta: el PCI queda del lado de MercadoPago (ADR-013)', () => {
    renderCheckout(turno());

    // Ningún campo de entrada en toda la pantalla de pago.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });

  it('al pagar lleva a la confirmación', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCheckout(turno());

    await user.click(screen.getByRole('button', { name: /pagar/i }));
    await vi.advanceTimersByTimeAsync(2000);

    expect(await screen.findByText(/tu consulta quedó agendada/i)).toBeVisible();
  });

  it('el rechazo simulado deja el turno reservado y ofrece reintentar', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderCheckout(turno());

    await user.click(screen.getByRole('button', { name: /simular un pago rechazado/i }));
    await vi.advanceTimersByTimeAsync(2000);

    expect(await screen.findByRole('alert')).toHaveTextContent(/rechazado/i);
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
