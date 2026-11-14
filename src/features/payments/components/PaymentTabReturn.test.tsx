// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentTabReturn } from './PaymentTabReturn';
import { esPestanaDePago, marcarPagoEnPestana } from '../lib/checkoutTab';

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
  cleanup();
});

describe('PaymentTabReturn (ENG-199)', () => {
  it('avisa, borra la marca y se intenta cerrar sola', async () => {
    vi.useFakeTimers();
    marcarPagoEnPestana('a1');
    const cerrar = vi.fn();

    render(
      <PaymentTabReturn
        appointmentId="a1"
        resultado="exito"
        onSeguirAca={vi.fn()}
        cerrar={cerrar}
      />,
    );

    expect(screen.getByRole('heading', { name: /ya podés cerrar esta pestaña/i })).toBeVisible();
    expect(esPestanaDePago('a1')).toBe(false);
    await vi.advanceTimersByTimeAsync(700);
    expect(cerrar).toHaveBeenCalled();
  });

  it('si el pago no salió, manda a reintentar en la pestaña de origen', () => {
    render(
      <PaymentTabReturn
        appointmentId="a1"
        resultado="fallo"
        onSeguirAca={vi.fn()}
        cerrar={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: /el pago no se completó/i })).toBeVisible();
  });

  it('se puede seguir en esta pestaña', async () => {
    const onSeguirAca = vi.fn();
    render(
      <PaymentTabReturn
        appointmentId="a1"
        resultado="exito"
        onSeguirAca={onSeguirAca}
        cerrar={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /seguir en esta pestaña/i }));
    expect(onSeguirAca).toHaveBeenCalled();
  });
});
