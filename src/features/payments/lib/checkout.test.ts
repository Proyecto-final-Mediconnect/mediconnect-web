import { describe, expect, it } from 'vitest';
import { amountLinesFor, canPay, findAppointment, payabilityOf } from './checkout';
import type { Appointment } from '../../appointments/types/appointment';

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
    const resultado = payabilityOf(
      turno({ scheduledAt: '2026-09-01T12:00:00Z' }),
      AHORA,
    );

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
