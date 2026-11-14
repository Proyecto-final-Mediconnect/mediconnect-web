import { describe, expect, it } from 'vitest';
import { paymentMethodLabel } from './receipt';
import { formatRestante, restanteParaPagar } from './waiting';

describe('paymentMethodLabel (ENG-199)', () => {
  it('nombra los medios que informa MercadoPago', () => {
    expect(paymentMethodLabel('account_money')).toBe('Dinero en cuenta de MercadoPago');
    expect(paymentMethodLabel('credit_card')).toBe('Tarjeta de crédito');
    expect(paymentMethodLabel('debit_card')).toBe('Tarjeta de débito');
  });

  it('un medio desconocido o sin dato dice MercadoPago, nunca queda vacío', () => {
    expect(paymentMethodLabel('crypto')).toBe('MercadoPago');
    expect(paymentMethodLabel(null)).toBe('MercadoPago');
  });
});

describe('tiempo para pagar (ENG-199)', () => {
  const RESERVA = '2026-11-17T12:00:00.000Z';

  it('cuenta los 15 minutos desde la reserva', () => {
    expect(restanteParaPagar(RESERVA, new Date('2026-11-17T12:03:00.000Z'))).toBe(12 * 60_000);
    expect(formatRestante(12 * 60_000)).toBe('12:00');
    expect(formatRestante(65_500)).toBe('1:06');
  });

  it('vencido da 0 y sin fecha de reserva no se sabe', () => {
    expect(restanteParaPagar(RESERVA, new Date('2026-11-17T12:20:00.000Z'))).toBe(0);
    expect(restanteParaPagar(null, new Date())).toBeNull();
  });
});
