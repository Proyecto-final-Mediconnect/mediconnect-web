// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AppointmentConfirmedPage } from './AppointmentConfirmedPage';
import type { Appointment } from '../features/appointments/types/appointment';

/** La confirmación de la reserva con el comprobante del pago (ENG-199). */

const PATIENT_ID = '11111111-1111-4111-8111-111111111111';

const TURNO: Appointment = {
  id: 'a1',
  scheduledAt: '2030-11-17T12:00:00Z',
  date: '2030-11-17',
  startTime: '09:00',
  durationMinutes: 30,
  price: 9500,
  currency: 'ARS',
  status: 'CONFIRMADO',
  professional: { id: 'p1', firstName: 'Ana', lastName: 'García' },
  patient: { id: PATIENT_ID, firstName: 'Julián', lastName: 'Sosa' },
};

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderPage(pago: Record<string, unknown>, turno: Appointment = TURNO) {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input);
    if (url.includes('/appointments/me')) return Promise.resolve(json([turno]));
    if (url.includes('/payment')) return Promise.resolve(json({ appointmentId: 'a1', ...pago }));
    return Promise.resolve(
      json({
        id: PATIENT_ID,
        email: 'paciente@test.com',
        role: 'PACIENTE',
        firstName: 'Julián',
        lastName: 'Sosa',
      }),
    );
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/turnos/a1/confirmado']}>
        <Routes>
          <Route path="/turnos/:appointmentId/confirmado" element={<AppointmentConfirmedPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

describe('AppointmentConfirmedPage (ENG-199)', () => {
  it('con el pago acreditado muestra el comprobante con medio y número de operación', async () => {
    renderPage({
      status: 'APROBADO',
      appointmentStatus: 'CONFIRMADO',
      confirmedAt: '2030-11-14T00:36:15Z',
      receipt: {
        amount: 9500,
        currency: 'ARS',
        method: 'account_money',
        operationId: '189539998660',
      },
    });

    expect(await screen.findByText('Pago acreditado')).toBeVisible();
    expect(screen.getByRole('heading', { name: /tu turno está confirmado/i })).toBeVisible();
    const comprobante = await screen.findByRole('region', { name: /comprobante/i });
    expect(comprobante).toHaveTextContent('Dinero en cuenta de MercadoPago');
    expect(comprobante).toHaveTextContent('N.º de operación de MercadoPago: 189539998660');
    expect(screen.getByRole('link', { name: 'Ver mi turno' })).toHaveAttribute(
      'href',
      '/turnos/a1',
    );
  });

  it('sin pago acreditado no afirma que se pagó', async () => {
    renderPage(
      { status: 'PENDIENTE', appointmentStatus: 'RESERVADO_SIN_PAGAR', receipt: null },
      { ...TURNO, status: 'RESERVADO_SIN_PAGAR' },
    );

    expect(
      await screen.findByRole('heading', { name: /tu consulta quedó agendada/i }),
    ).toBeVisible();
    expect(screen.queryByText('Pago acreditado')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /comprobante/i })).not.toBeInTheDocument();
  });
});
