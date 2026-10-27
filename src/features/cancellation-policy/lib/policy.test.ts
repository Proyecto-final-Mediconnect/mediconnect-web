import { describe, expect, it } from 'vitest';
import {
  describePolicy,
  refundOutcomeText,
  refundPercentFor,
  refundQuoteText,
  rescheduleBlockedText,
  validatePolicy,
} from './policy';

const DEFAULT = { hoursFullRefund: 24, hoursPartialRefund: 6, partialRefundPercent: 50 };
const NOW = new Date('2026-10-22T12:00:00.000Z');

function enHoras(h: number): Date {
  return new Date(NOW.getTime() + h * 3_600_000);
}

describe('validatePolicy', () => {
  it('acepta la política por defecto', () => {
    expect(validatePolicy(DEFAULT)).toBeNull();
  });

  it('rechaza una ventana parcial más lejana que la total', () => {
    expect(validatePolicy({ ...DEFAULT, hoursFullRefund: 6, hoursPartialRefund: 24 })).toMatch(
      /más anticipación/,
    );
  });

  it.each([
    [{ ...DEFAULT, partialRefundPercent: 150 }, /entre 0 y 100/],
    [{ ...DEFAULT, partialRefundPercent: -1 }, /entre 0 y 100/],
    [{ ...DEFAULT, hoursFullRefund: 721 }, /720/],
    [{ ...DEFAULT, hoursPartialRefund: -2 }, /negativas/],
    [{ ...DEFAULT, hoursFullRefund: 1.5 }, /entero/],
    [{ ...DEFAULT, hoursFullRefund: Number.NaN }, /entero/],
  ])('rechaza %o', (policy, mensaje) => {
    expect(validatePolicy(policy)).toMatch(mensaje);
  });
});

describe('refundPercentFor', () => {
  it.each([
    [25, 100],
    [24, 100],
    [10, 50],
    [6, 50],
    [1, 0],
    [-1, 0],
  ])('a %i h del turno devuelve %i %%', (horas, esperado) => {
    expect(refundPercentFor(DEFAULT, enHoras(horas), NOW)).toBe(esperado);
  });
});

describe('describePolicy', () => {
  it('cuenta los tres tramos de la política por defecto', () => {
    expect(describePolicy(DEFAULT)).toBe(
      'Si cancelás con 24 horas o más de anticipación, te devolvemos el 100 %. ' +
        'Entre 24 horas y 6 horas antes, el 50 %. Con menos de 6 horas, no hay devolución.',
    );
  });

  it('sin tramo parcial cuando el porcentaje es 0', () => {
    expect(describePolicy({ ...DEFAULT, partialRefundPercent: 0 })).toBe(
      'Si cancelás con 24 horas o más de anticipación, te devolvemos el 100 %. ' +
        'Con menos de 24 horas, no hay devolución.',
    );
  });

  it('un parcial del 100 % es una devolución total con menos anticipación', () => {
    expect(describePolicy({ ...DEFAULT, partialRefundPercent: 100 })).toBe(
      'Si cancelás con 6 horas o más de anticipación, te devolvemos el 100 %. ' +
        'Con menos de 6 horas, no hay devolución.',
    );
  });

  it('con 0 horas para el parcial, el parcial llega hasta el turno', () => {
    expect(describePolicy({ ...DEFAULT, hoursPartialRefund: 0 })).toBe(
      'Si cancelás con 24 horas o más de anticipación, te devolvemos el 100 %. ' +
        'Con menos de 24 horas, el 50 %.',
    );
  });

  it('con 0 horas para el total, siempre se devuelve todo', () => {
    expect(
      describePolicy({ hoursFullRefund: 0, hoursPartialRefund: 0, partialRefundPercent: 50 }),
    ).toBe('Podés cancelar hasta el horario del turno y te devolvemos el 100 %.');
  });

  it('usa el singular para una hora', () => {
    expect(
      describePolicy({ hoursFullRefund: 1, hoursPartialRefund: 0, partialRefundPercent: 0 }),
    ).toContain('con 1 hora o más');
  });
});

describe('refundQuoteText (ENG-65)', () => {
  it('con el reembolso automático dice que se devuelve por MercadoPago', () => {
    expect(refundQuoteText(50, '$ 7.500', true)).toBe(
      'Según la política del profesional, te corresponde el 50 % ($ 7.500). ' +
        'Te lo devolvemos por MercadoPago, al mismo medio con el que pagaste.',
    );
  });

  it('sin el reembolso automático no lo promete', () => {
    expect(refundQuoteText(100, '$ 15.000', false)).toMatch(
      /la devolución total.*se gestiona aparte/,
    );
  });

  it('con 0 % no habla de devolución', () => {
    expect(refundQuoteText(0, '$ 0', true)).toBe(
      'Según la política del profesional, si cancelás ahora no te corresponde devolución.',
    );
  });
});

describe('refundOutcomeText (ENG-65)', () => {
  const monto = (n: number) => `$${n}`;

  it.each([
    ['PROCESADO', /Te devolvemos \$7500 por MercadoPago/],
    ['PENDIENTE', /todavía no la confirmó/],
    ['RECHAZADO', /no aceptó la devolución de \$7500/],
  ] as const)('%s', (status, texto) => {
    expect(refundOutcomeText({ amount: 7500, status }, monto)).toMatch(texto);
  });

  it('sin nada que devolver, o con un backend sin ENG-65, no dice nada', () => {
    expect(refundOutcomeText({ amount: 0, status: null }, monto)).toBeNull();
    expect(refundOutcomeText(undefined, monto)).toBeNull();
  });
});

describe('rescheduleBlockedText (ENG-66)', () => {
  it('con la anticipación de la devolución total se puede reprogramar', () => {
    expect(rescheduleBlockedText(DEFAULT, enHoras(24), NOW)).toBeNull();
  });

  it('con menos anticipación explica por qué no', () => {
    expect(rescheduleBlockedText(DEFAULT, enHoras(10), NOW)).toBe(
      'Con menos de 24 horas ya no se puede reprogramar.',
    );
  });

  it('un parcial del 100 % corre el límite a sus horas', () => {
    const p = { ...DEFAULT, partialRefundPercent: 100 };
    expect(rescheduleBlockedText(p, enHoras(10), NOW)).toBeNull();
    expect(rescheduleBlockedText(p, enHoras(1), NOW)).toBe(
      'Con menos de 6 horas ya no se puede reprogramar.',
    );
  });
});
