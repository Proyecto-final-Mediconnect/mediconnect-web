import { describe, expect, it } from 'vitest';
import {
  amountLinesFor,
  canPay,
  checkoutResultOf,
  findAppointment,
  payabilityOf,
  PAYMENT_METHODS,
  paymentOutcomeOf,
} from './checkout';
import type { Appointment } from '../../appointments/types/appointment';
import type { PaymentStatusView } from '../types/payment';

const AHORA = new Date('2026-09-03T12:00:00Z');

function turno(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'a1',
    scheduledAt: '2026-09-10T12:00:00Z',
    date: '2026-09-10',
    startTime: '09:00',
    durationMinutes: 30,
    price: 12000,
    currency: 'ARS',
    status: 'RESERVADO_SIN_PAGAR',
    professional: null,
    patient: null,
    ...overrides,
  };
}

describe('payabilityOf', () => {
  it('un turno futuro reservado sin pagar se puede pagar', () => {
    expect(payabilityOf(turno(), AHORA)).toEqual({ kind: 'PAYABLE' });
  });

  it('un turno confirmado ya está pago y no se vuelve a cobrar', () => {
    // CONFIRMADO es justamente el estado al que lleva el pago aprobado.
    expect(payabilityOf(turno({ status: 'CONFIRMADO' }), AHORA)).toEqual({
      kind: 'ALREADY_PAID',
    });
  });

  it('un turno cancelado no se paga, y lo dice', () => {
    const resultado = payabilityOf(turno({ status: 'CANCELADO' }), AHORA);

    expect(resultado.kind).toBe('NOT_PAYABLE');
    expect(resultado).toHaveProperty('reason', expect.stringMatching(/cancelado/i));
  });

  it('un turno liberado explica que el horario volvió a estar libre', () => {
    const resultado = payabilityOf(turno({ status: 'LIBERADO' }), AHORA);

    expect(resultado).toHaveProperty('reason', expect.stringMatching(/liberó/i));
  });

  it('un turno que ya pasó no se paga aunque siga sin pagar', () => {
    const resultado = payabilityOf(turno({ scheduledAt: '2026-09-01T12:00:00Z' }), AHORA);

    expect(resultado).toHaveProperty('reason', expect.stringMatching(/ya pasó/i));
  });

  it('el borde es el instante del turno, no el día', () => {
    // Justo cuando arranca ya no se cobra; un segundo antes todavía sí.
    expect(canPay(turno({ scheduledAt: AHORA.toISOString() }), AHORA)).toBe(false);
    expect(
      canPay(turno({ scheduledAt: new Date(AHORA.getTime() + 1000).toISOString() }), AHORA),
    ).toBe(true);
  });
});

describe('amountLinesFor', () => {
  it('el total coincide con el precio del turno: MediConnect no suma cargos', () => {
    const lineas = amountLinesFor(turno());
    const total = lineas.find((l) => l.isTotal);

    expect(total?.amount).toBe(12000);
    expect(lineas.filter((l) => !l.isTotal)).toHaveLength(1);
  });
});

describe('findAppointment', () => {
  it('encuentra el turno por id', () => {
    const buscado = turno({ id: 'b2' });

    expect(findAppointment([turno(), buscado], 'b2')).toBe(buscado);
  });

  it('sin id en la URL devuelve null en vez de agarrar el primero', () => {
    expect(findAppointment([turno()], undefined)).toBeNull();
  });

  it('un id que no está en la lista devuelve null', () => {
    expect(findAppointment([turno()], 'no-existe')).toBeNull();
  });
});

describe('checkoutResultOf', () => {
  it.each(['exito', 'pendiente', 'fallo'] as const)('reconoce resultado=%s', (valor) => {
    expect(checkoutResultOf(new URLSearchParams({ resultado: valor }))).toBe(valor);
  });

  it('ignora lo que no mandó MercadoPago', () => {
    expect(checkoutResultOf(new URLSearchParams({ resultado: 'approved' }))).toBeNull();
    expect(checkoutResultOf(new URLSearchParams())).toBeNull();
  });
});

describe('paymentOutcomeOf', () => {
  const vista = (status: PaymentStatusView['status'], appointmentStatus: string) => ({
    appointmentId: 'a1',
    status,
    appointmentStatus,
  });

  it('solo el turno CONFIRMADO cuenta como confirmado', () => {
    expect(paymentOutcomeOf(vista('APROBADO', 'CONFIRMADO'))).toBe('CONFIRMADO');
  });

  it('un pago aprobado con el turno todavía sin confirmar sigue esperando', () => {
    // El webhook mueve las dos filas; entre una lectura y otra puede verse a medias.
    expect(paymentOutcomeOf(vista('APROBADO', 'RESERVADO_SIN_PAGAR'))).toBe('ESPERANDO');
  });

  it('un pago aprobado sobre un turno cancelado o liberado no se confirma', () => {
    expect(paymentOutcomeOf(vista('APROBADO', 'CANCELADO'))).toBe('SIN_TURNO');
    expect(paymentOutcomeOf(vista('APROBADO', 'LIBERADO'))).toBe('SIN_TURNO');
  });

  it('un turno que ya no espera pago, sin pago aprobado, no sigue esperando', () => {
    // Es lo que deja el job de ENG-101 a los 15 minutos. Antes caía en
    // ESPERANDO y la pantalla prometía que el turno se confirmaba solo.
    expect(paymentOutcomeOf(vista('PENDIENTE', 'LIBERADO'))).toBe('TURNO_VENCIDO');
    expect(paymentOutcomeOf(vista('PENDIENTE', 'CANCELADO'))).toBe('TURNO_VENCIDO');
    expect(paymentOutcomeOf(vista('SIN_INICIAR', 'LIBERADO'))).toBe('TURNO_VENCIDO');
  });

  it('el turno vencido no se tapa con el resultado de la URL', () => {
    // Volver con `exito` no resucita un turno que ya se liberó.
    expect(paymentOutcomeOf(vista('PENDIENTE', 'LIBERADO'), 'exito')).toBe('TURNO_VENCIDO');
    expect(paymentOutcomeOf(vista('PENDIENTE', 'LIBERADO'), 'pendiente')).toBe('TURNO_VENCIDO');
  });

  it('distingue el rechazo de la espera', () => {
    expect(paymentOutcomeOf(vista('RECHAZADO', 'RESERVADO_SIN_PAGAR'))).toBe('RECHAZADO');
    expect(paymentOutcomeOf(vista('PENDIENTE', 'RESERVADO_SIN_PAGAR'))).toBe('ESPERANDO');
    expect(paymentOutcomeOf(vista('SIN_INICIAR', 'RESERVADO_SIN_PAGAR'))).toBe('ESPERANDO');
  });

  it('un RECHAZADO al volver con exito o pendiente es del intento anterior: sigue esperando', () => {
    const rechazado = vista('RECHAZADO', 'RESERVADO_SIN_PAGAR');
    expect(paymentOutcomeOf(rechazado, 'exito')).toBe('ESPERANDO');
    expect(paymentOutcomeOf(rechazado, 'pendiente')).toBe('ESPERANDO');
    expect(paymentOutcomeOf(rechazado, 'fallo')).toBe('RECHAZADO');
    expect(paymentOutcomeOf(rechazado, null)).toBe('RECHAZADO');
  });
});

describe('PAYMENT_METHODS', () => {
  it('no ofrece efectivo: no se acredita dentro de los 15 minutos de ENG-101', () => {
    const texto = PAYMENT_METHODS.join(' ').toLowerCase();
    expect(texto).not.toContain('efectivo');
    expect(texto).not.toContain('rapipago');
    expect(texto).not.toContain('pago fácil');
  });

  it('sigue ofreciendo los medios que se acreditan al instante', () => {
    expect(PAYMENT_METHODS).toContain('Tarjeta de crédito');
    expect(PAYMENT_METHODS).toContain('Tarjeta de débito');
    expect(PAYMENT_METHODS).toContain('Dinero en cuenta de MercadoPago');
  });
});
