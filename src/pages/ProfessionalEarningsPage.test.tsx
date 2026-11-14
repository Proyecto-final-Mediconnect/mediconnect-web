// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ProfessionalEarningsPage } from './ProfessionalEarningsPage';

const NOW = new Date('2026-11-20T15:00:00Z');
const SESION = {
  id: 'p1',
  email: 'pro@test.com',
  role: 'PROFESIONAL',
  firstName: 'Ana',
  lastName: 'García',
};

const COBROS = {
  from: '2026-11-01',
  to: '2026-11-30',
  currency: 'ARS',
  totals: { cobrado: 36000, reembolsado: 9000, neto: 27000, pendiente: 0, turnos: 2 },
  rows: [
    {
      appointmentId: 't1',
      paidAt: '2026-11-10T13:00:00Z',
      date: '2026-11-12',
      startTime: '10:00',
      patient: 'Julián Sosa',
      amount: 18000,
      refunded: 9000,
      refundPending: 0,
      net: 9000,
      state: 'REEMBOLSO_PARCIAL',
      refundPercent: 50,
    },
    {
      appointmentId: 't2',
      paidAt: '2026-11-11T13:00:00Z',
      date: '2026-11-13',
      startTime: '11:00',
      patient: 'Marina Quiroga',
      amount: 18000,
      refunded: 0,
      refundPending: 0,
      net: 18000,
      state: 'COBRADO',
      refundPercent: null,
    },
  ],
  pagina: 1,
  hayMas: false,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderPage(cobros: (url: string) => Response) {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input);
    if (url.includes('/earnings')) return Promise.resolve(cobros(url));
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
        <ProfessionalEarningsPage />
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

describe('ProfessionalEarningsPage (ENG-194)', () => {
  it('muestra los totales del mes y los cobros por turno, con el reembolso parcial', async () => {
    renderPage(() => json(COBROS));

    expect(await screen.findByText('Julián Sosa')).toBeVisible();
    expect(screen.getByText('Reembolsado 50 %')).toBeVisible();
    expect(screen.getByText('Cobrado', { selector: 'span' })).toBeVisible();
    expect(screen.getByText(/27\.000/)).toBeVisible();
    const fetches = vi.mocked(globalThis.fetch).mock.calls.map(([u]) => String(u));
    expect(fetches.some((u) => u.includes('from=2026-11-01&to=2026-11-30'))).toBe(true);
  });

  it('cambiar de mes pide el período nuevo', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderPage(() => json(COBROS));
    await screen.findByText('Julián Sosa');

    await user.click(screen.getByRole('button', { name: 'Mes anterior' }));

    expect(await screen.findByText('octubre de 2026')).toBeVisible();
    const fetches = vi.mocked(globalThis.fetch).mock.calls.map(([u]) => String(u));
    expect(fetches.some((u) => u.includes('from=2026-10-01&to=2026-10-31'))).toBe(true);
    // No se puede ir a un mes que todavía no empezó.
    await user.click(screen.getByRole('button', { name: 'Mes siguiente' }));
    expect(screen.getByRole('button', { name: 'Mes siguiente' })).toBeDisabled();
  });

  it('sin cobros, lo dice con el mes', async () => {
    renderPage(() =>
      json({
        ...COBROS,
        rows: [],
        totals: { cobrado: 0, reembolsado: 0, neto: 0, pendiente: 0, turnos: 0 },
      }),
    );

    expect(await screen.findByText('No tuviste cobros en noviembre de 2026')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Descargar CSV' })).toBeDisabled();
  });

  it('si falla, muestra el error y deja reintentar', async () => {
    renderPage(() => json({ message: 'Se cayó.' }, 500));

    const alerta = await screen.findByRole('alert');
    expect(within(alerta).getByRole('button', { name: 'Reintentar' })).toBeVisible();
  });
});
