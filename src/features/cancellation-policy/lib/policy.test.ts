import { describe, expect, it } from 'vitest';
import { TEST_PUBLIC_CONFIG } from '../../../shared/config/testPublicConfig';
import { describePolicy, refundOutcomeText, refundQuoteText, validatePolicy } from './policy';

/** Los límites que informa hoy el backend (`GET /config`). */
const LIMITS = TEST_PUBLIC_CONFIG.cancellationPolicy;

const DEFAULT = { hoursFullRefund: 24, hoursPartialRefund: 6, partialRefundPercent: 50 };

describe('validatePolicy', () => {
  it('acepta la política por defecto', () => {
    expect(validatePolicy(DEFAULT, LIMITS)).toBeNull();
  });

  it('rechaza una ventana parcial más lejana que la total', () => {
    expect(
      validatePolicy({ ...DEFAULT, hoursFullRefund: 6, hoursPartialRefund: 24 }, LIMITS),
    ).toMatch(/más anticipación/);
  });

  it.each([
    [{ ...DEFAULT, partialRefundPercent: 150 }, /entre 0 y 100/],
    [{ ...DEFAULT, partialRefundPercent: -1 }, /entre 0 y 100/],
    [{ ...DEFAULT, hoursFullRefund: 721 }, /720/],
    [{ ...DEFAULT, hoursPartialRefund: -2 }, /negativas/],
    [{ ...DEFAULT, hoursFullRefund: 1.5 }, /entero/],
    [{ ...DEFAULT, hoursFullRefund: Number.NaN }, /entero/],
  ])('rechaza %o', (policy, mensaje) => {
    expect(validatePolicy(policy, LIMITS)).toMatch(mensaje);
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
  it('dice que se devuelve por MercadoPago', () => {
    expect(refundQuoteText(50, '$ 7.500')).toBe(
      'Según la política del profesional, te corresponde el 50 % ($ 7.500). ' +
        'Te lo devolvemos por MercadoPago, al mismo medio con el que pagaste.',
    );
  });

  it('el 100 % es la devolución total', () => {
    expect(refundQuoteText(100, '$ 15.000')).toMatch(/la devolución total \(\$ 15\.000\)/);
  });

  it('con 0 % no habla de devolución', () => {
    expect(refundQuoteText(0, '$ 0')).toBe(
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

describe('validatePolicy con los límites de MediConnect (ENG-205)', () => {
  it('rechaza un total que exige más de 24 h', () => {
    expect(validatePolicy({ ...DEFAULT, hoursFullRefund: 48 }, LIMITS)).toMatch(/24 horas/);
  });

  it('rechaza un parcial menor al 30 %', () => {
    expect(validatePolicy({ ...DEFAULT, partialRefundPercent: 20 }, LIMITS)).toMatch(/30 %/);
  });

  it('acepta los límites exactos', () => {
    expect(
      validatePolicy(
        { hoursFullRefund: 24, hoursPartialRefund: 6, partialRefundPercent: 30 },
        LIMITS,
      ),
    ).toBeNull();
  });
});

describe('validatePolicy con otros límites (ENG-229)', () => {
  it('valida con lo que informa el backend, no con números propios', () => {
    const otros = { maxHours: 100, maxFullRefundHours: 12, minPartialRefundPercent: 40 };
    expect(validatePolicy({ ...DEFAULT, hoursFullRefund: 24 }, otros)).toMatch(/12 horas/);
    expect(
      validatePolicy(
        { hoursFullRefund: 12, hoursPartialRefund: 6, partialRefundPercent: 30 },
        otros,
      ),
    ).toMatch(/40 %/);
    expect(
      validatePolicy(
        { hoursFullRefund: 12, hoursPartialRefund: 6, partialRefundPercent: 40 },
        otros,
      ),
    ).toBeNull();
  });
});
