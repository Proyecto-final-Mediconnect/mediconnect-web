import type { Appointment } from '../types/appointment';

/**
 * Qué pasó con un turno que quedó a reprogramar, según la causa (ENG-237).
 *
 * Una consulta a la que el profesional no se conectó, o que falló, no es una
 * cancelación: decir "canceló" sería contar otra cosa. Sin causa (o con un
 * backend anterior) es la cancelación a mano de ENG-204.
 */
export function reprogramHeadline(
  appointment: Pick<Appointment, 'reprogramCause'>,
  isPatient: boolean,
  profesional: string,
  paciente: string,
): string {
  switch (appointment.reprogramCause) {
    case 'AUSENCIA_PROFESIONAL':
      return isPatient
        ? `${profesional} no se conectó a tu consulta`
        : `No te conectaste a esta consulta. ${paciente} tiene que elegir.`;
    case 'FALLA_TECNICA':
      return isPatient
        ? 'Tu consulta no se pudo completar por una falla técnica'
        : `Informaste una falla técnica. ${paciente} tiene que elegir.`;
    default:
      return isPatient
        ? `${profesional} no va a poder atenderte`
        : `Cancelaste este turno. ${paciente} tiene que elegir.`;
  }
}

/** El paso de la historia del turno en que dejó de valer el horario. */
export function reprogramStepTitle(
  appointment: Pick<Appointment, 'reprogramCause'>,
  isPatient: boolean,
  profesional: string,
): string {
  switch (appointment.reprogramCause) {
    case 'AUSENCIA_PROFESIONAL':
      return isPatient
        ? `${profesional} no se conectó a la consulta`
        : 'No te conectaste a la consulta';
    case 'FALLA_TECNICA':
      return isPatient
        ? `${profesional} informó una falla técnica`
        : 'Informaste una falla técnica';
    default:
      return isPatient ? `${profesional} canceló el turno` : 'Cancelaste el turno';
  }
}

/**
 * Si el motivo guardado le dice algo al paciente. El de la ausencia es fijo
 * ("El profesional no se conectó…") y repetiría el título.
 */
export function showsReason(appointment: Pick<Appointment, 'reprogramCause'>): boolean {
  return appointment.reprogramCause !== 'AUSENCIA_PROFESIONAL';
}
