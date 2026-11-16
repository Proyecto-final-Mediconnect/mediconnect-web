// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Appointment } from '../../appointments/types/appointment';
import { PaymentReceipt } from './PaymentReceipt';

const receipt = {
  amount: 18000,
  currency: 'ARS',
  method: 'credit_card',
  operationId: '123456789',
};

const appointment = {
  id: 'a1',
  scheduledAt: '2026-11-20T13:00:00Z',
  date: '2026-11-20',
  startTime: '10:00',
  durationMinutes: 30,
  price: 18000,
  currency: 'ARS',
  status: 'CONFIRMADO',
  professional: { id: 'p1', firstName: 'Ana', lastName: 'García' },
  patient: { id: 'u1', firstName: 'Juan', lastName: 'Pérez' },
} as Appointment;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PaymentReceipt: comprobante en PDF', () => {
  it('sin el turno no ofrece descargarlo', () => {
    render(<PaymentReceipt receipt={receipt} confirmedAt="2026-11-15T15:00:00Z" />);

    expect(screen.queryByRole('button', { name: /Descargar comprobante/ })).toBeNull();
  });

  it('arma la hoja con el turno y el pago, e imprime', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const user = userEvent.setup();
    render(
      <PaymentReceipt
        receipt={receipt}
        confirmedAt="2026-11-15T15:00:00Z"
        appointment={appointment}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Descargar comprobante/ }));

    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    const hoja = document.querySelector('.hoja-reporte');
    expect(hoja).not.toBeNull();
    expect(hoja).toHaveTextContent('Comprobante de pago');
    expect(hoja).toHaveTextContent('Juan Pérez');
    expect(hoja).toHaveTextContent('Ana García');
    expect(hoja).toHaveTextContent('Tarjeta de crédito');
    expect(hoja).toHaveTextContent('123456789');
    expect(hoja).toHaveTextContent('$18.000');
    expect(hoja).toHaveTextContent('15 de noviembre de 2026 · 12:00');
    expect(document.title).toBe('Comprobante MediConnect 2026-11-20');

    // Terminada la impresión, la hoja se desmonta.
    window.dispatchEvent(new Event('afterprint'));
    await waitFor(() => expect(document.querySelector('.hoja-reporte')).toBeNull());
  });
});
