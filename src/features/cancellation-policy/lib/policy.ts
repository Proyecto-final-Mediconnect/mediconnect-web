import type { CancellationPolicy } from '../types/cancellationPolicy';

/** Los mismos topes que valida el backend (`UpdateCancellationPolicyDto`). */
export const MAX_POLICY_HOURS = 720;
export const MAX_REFUND_PERCENT = 100;

/**
 * Valida la política antes de mandarla. Devuelve el primer problema o `null`.
 *
 * Repite las reglas del backend para que el profesional vea el error sin ir y
 * volver al servidor; el backend las vuelve a chequear igual.
 */
export function validatePolicy(policy: CancellationPolicy): string | null {
  const { hoursFullRefund, hoursPartialRefund, partialRefundPercent } = policy;

  for (const [valor, campo] of [
    [hoursFullRefund, 'Las horas para la devolución total'],
    [hoursPartialRefund, 'Las horas para la devolución parcial'],
  ] as const) {
    if (!Number.isInteger(valor)) return `${campo} tienen que ser un número entero.`;
    if (valor < 0) return `${campo} no pueden ser negativas.`;
    if (valor > MAX_POLICY_HOURS) {
      return `${campo} no pueden superar ${MAX_POLICY_HOURS} (30 días).`;
    }
  }

  if (!Number.isInteger(partialRefundPercent)) {
    return 'El porcentaje tiene que ser un número entero.';
  }
  if (partialRefundPercent < 0 || partialRefundPercent > MAX_REFUND_PERCENT) {
    return 'El porcentaje tiene que estar entre 0 y 100.';
  }

  if (hoursFullRefund < hoursPartialRefund) {
    return 'La devolución total tiene que pedir más anticipación que la parcial: si no, la parcial nunca se aplica.';
  }

  return null;
}

/**
 * Qué porcentaje se devuelve cancelando en `now` un turno de `scheduledAt`.
 *
 * Es la misma cuenta que `refundPercentFor` del backend: en el borde exacto de
 * una ventana gana el paciente, y un turno ya pasado devuelve 0.
 */
export function refundPercentFor(policy: CancellationPolicy, scheduledAt: Date, now: Date): number {
  const hoursUntil = (scheduledAt.getTime() - now.getTime()) / 3_600_000;

  if (hoursUntil < 0) return 0;
  if (hoursUntil >= policy.hoursFullRefund) return MAX_REFUND_PERCENT;
  if (hoursUntil >= policy.hoursPartialRefund) return policy.partialRefundPercent;
  return 0;
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
