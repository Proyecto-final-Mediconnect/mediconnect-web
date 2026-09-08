/**
 * Los pasos de una reserva, de elegir el servicio a tener el turno confirmado.
 *
 * Viven aparte del componente que los dibuja porque los comparten tres pantallas
 * —reserva, pago y confirmación— y el paso activo es justamente lo que las hila.
 * Si cada una contara los suyos, la primera vez que se agregue un paso las tres
 * empezarían a contar distinto.
 */

/** Pasos tal como los nombra el diseño. */
export const PASOS = ['Servicio', 'Horario', 'Revisión', 'Pago', 'Listo'] as const;

export const PASO_HORARIO = 2;
export const PASO_REVISION = 3;
export const PASO_PAGO = 4;
export const PASO_LISTO = 5;
