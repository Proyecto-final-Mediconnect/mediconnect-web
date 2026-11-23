import type { PublicConfig } from '../../../shared/config/publicConfig';
import type { CancellationPolicy } from '../types/cancellationPolicy';

/** 100 %: la devolución total. */
export const MAX_REFUND_PERCENT = 100;

/** Los límites de la plataforma, tal como los informa el backend (`GET /config`). */
export type PolicyLimits = PublicConfig['cancellationPolicy'];

/**
 * Valida la política antes de mandarla. Devuelve el primer problema o `null`.
 *
 * Valida con los límites que informa el backend (ENG-229), para que el
 * profesional vea el error sin ir y volver al servidor; el backend los vuelve a
 * chequear igual.
 */
export function validatePolicy(policy: CancellationPolicy, limits: PolicyLimits): string | null {
  const { hoursFullRefund, hoursPartialRefund, partialRefundPercent } = policy;
  const { maxHours, maxFullRefundHours, minPartialRefundPercent } = limits;

  for (const [valor, campo] of [
    [hoursFullRefund, 'Las horas para la devolución total'],
    [hoursPartialRefund, 'Las horas para la devolución parcial'],
  ] as const) {
    if (!Number.isInteger(valor)) return `${campo} tienen que ser un número entero.`;
    if (valor < 0) return `${campo} no pueden ser negativas.`;
    if (valor > maxHours) {
      return `${campo} no pueden superar ${maxHours}.`;
    }
  }

  if (!Number.isInteger(partialRefundPercent)) {
    return 'El porcentaje tiene que ser un número entero.';
  }
  if (partialRefundPercent < 0 || partialRefundPercent > MAX_REFUND_PERCENT) {
    return 'El porcentaje tiene que estar entre 0 y 100.';
  }

  if (hoursFullRefund > maxFullRefundHours) {
    return `La devolución total tiene que aplicar al menos desde ${maxFullRefundHours} horas antes del turno: podés pedir menos anticipación, no más.`;
  }
  if (partialRefundPercent < minPartialRefundPercent) {
    return `La devolución parcial tiene que ser de al menos el ${minPartialRefundPercent} %.`;
  }

  if (hoursFullRefund < hoursPartialRefund) {
    return 'La devolución total tiene que pedir más anticipación que la parcial: si no, la parcial nunca se aplica.';
  }

  return null;
}

function horas(n: number): string {
  return n === 1 ? '1 hora' : `${n} horas`;
}

/**
 * La política en palabras, como la lee el paciente.
 *
 * Los casos raros no se cuentan como tramos: un parcial del 0 % o con las mismas
 * horas que el total nunca se aplica, y un parcial del 100 % es en realidad una
 * devolución total con menos anticipación.
 */
export function describePolicy(policy: CancellationPolicy): string {
  const { partialRefundPercent: pct } = policy;
  const total = pct === MAX_REFUND_PERCENT ? policy.hoursPartialRefund : policy.hoursFullRefund;
  const hayParcial = pct > 0 && pct < MAX_REFUND_PERCENT && policy.hoursPartialRefund < total;

  if (total === 0) {
    return 'Podés cancelar hasta el horario del turno y te devolvemos el 100 %.';
  }

  const partes = [`Si cancelás con ${horas(total)} o más de anticipación, te devolvemos el 100 %.`];
  let minimo = total;

  if (hayParcial) {
    const parcial = policy.hoursPartialRefund;
    partes.push(
      parcial === 0
        ? `Con menos de ${horas(total)}, el ${pct} %.`
        : `Entre ${horas(total)} y ${horas(parcial)} antes, el ${pct} %.`,
    );
    minimo = parcial;
  }

  if (minimo > 0) partes.push(`Con menos de ${horas(minimo)}, no hay devolución.`);

  return partes.join(' ');
}

/**
 * Lo que se le dice al paciente antes de cancelar un turno pagado, con la
 * cotización del backend (ENG-65): el porcentaje y el monto los calcula él.
 */
export function refundQuoteText(percent: number, monto: string): string {
  if (percent === 0) {
    return 'Según la política del profesional, si cancelás ahora no te corresponde devolución.';
  }

  const cuanto = percent === MAX_REFUND_PERCENT ? 'la devolución total' : `el ${percent} %`;
  return `Según la política del profesional, te corresponde ${cuanto} (${monto}). Te lo devolvemos por MercadoPago, al mismo medio con el que pagaste.`;
}

/** Qué pasó con la devolución, después de cancelar (ENG-65). `null` si no había nada que devolver. */
export function refundOutcomeText(
  refund: { amount: number; status: 'PROCESADO' | 'PENDIENTE' | 'RECHAZADO' | null } | undefined,
  monto: (amount: number) => string,
): string | null {
  if (!refund || refund.status === null) return null;

  switch (refund.status) {
    case 'PROCESADO':
      return `Te devolvemos ${monto(refund.amount)} por MercadoPago, al mismo medio con el que pagaste. Puede tardar unos días en verse.`;
    case 'PENDIENTE':
      return `Pedimos la devolución de ${monto(refund.amount)}, pero MercadoPago todavía no la confirmó. La seguimos nosotros.`;
    case 'RECHAZADO':
      return `MercadoPago no aceptó la devolución de ${monto(refund.amount)}. La vamos a resolver a mano.`;
  }
}
