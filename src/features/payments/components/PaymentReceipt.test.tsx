// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Appointment } from '../../appointments/types/appointment';
import { PaymentReceipt } from './PaymentReceipt';
import { descargarPdf } from '../../../shared/lib/pdf/pdf';
import { textoDe } from '../../../shared/lib/pdf/hoja';

// El PDF se arma de verdad en el armador de cada hoja; acá se mira qué se baja.
vi.mock('../../../shared/lib/pdf/pdf', () => ({ descargarPdf: vi.fn(() => Promise.resolve()) }));

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

  it('baja el PDF con el turno y el pago, sin imprimir', async () => {
    vi.mocked(descargarPdf).mockClear();
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

    await waitFor(() => expect(descargarPdf).toHaveBeenCalledTimes(1));
    expect(print).not.toHaveBeenCalled();
    const [doc, archivo] = vi.mocked(descargarPdf).mock.calls[0];
    expect(archivo).toBe('comprobante-mediconnect-2026-11-20.pdf');
    const texto = textoDe(doc.content);
    expect(texto).toContain('Comprobante de pago');
    expect(texto).toContain('Juan Pérez');
    expect(texto).toContain('Ana García');
    expect(texto).toContain('Tarjeta de crédito');
    expect(texto).toContain('123456789');
    expect(texto).toContain('$18.000');
    expect(texto).toContain('15 de noviembre de 2026 · 12:00');
  });
});
