import { useId, useState } from 'react';
import { ConfirmDialog } from '../../../../shared/ui/ConfirmDialog';
import { useCancelAsProfessional } from '../../hooks/useAppointments';
import { formatLongDate } from '../../lib/myAppointments';
import type { Appointment } from '../../types/appointment';

/** Largo del motivo. Espejan `CancelByProfessionalDto` del backend. */
export const MIN_REASON = 10;
export const MAX_REASON = 500;

/**
 * El profesional cancela un turno, con un motivo obligatorio (ENG-204,
 * ADR-018). Antes de confirmar le dice qué le va a pasar al paciente: con el
 * turno pagado, el paciente elige otro horario sin volver a pagar o el
 * reembolso del 100 %; con una reserva sin pagar, se cancela y se le avisa.
 *
 * Quien lo usa le pasa `key={appointment?.id}`: así cada turno arranca con el
 * motivo vacío sin un efecto que lo resetee.
 */
export function ProfessionalCancelDialog({
  appointment,
  onClose,
  onCancelled,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  /** Qué pasó, para mostrarlo después de cerrar. */
  onCancelled: (message: string) => void;
}) {
  const cancel = useCancelAsProfessional();
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const fieldId = useId();
  const helpId = useId();

  function cerrar() {
    cancel.reset();
    onClose();
  }

  const trimmed = reason.trim();
  const tooShort = trimmed.length < MIN_REASON;
  const paid = appointment?.status === 'CONFIRMADO';
  const patient = appointment?.patient?.firstName ?? 'el paciente';

  return (
    <ConfirmDialog
      open={appointment !== null}
      titulo="¿Cancelar el turno?"
      confirmar={cancel.isPending ? 'Cancelando…' : 'Sí, cancelar el turno'}
      cancelar="Mantener el turno"
      destructivo
      pendiente={cancel.isPending}
      onCancel={cerrar}
      onConfirm={() => {
        setTouched(true);
        if (!appointment || tooShort) return;
        cancel.mutate(
          { appointmentId: appointment.id, reason: trimmed },
          {
            onSuccess: (result) => {
              onCancelled(
                result.status === 'A_REPROGRAMAR'
                  ? `Cancelaste el turno. Le avisamos a ${patient}: puede elegir otro horario tuyo sin volver a pagar o pedir el reembolso del 100 %.`
                  : `Cancelaste la reserva. Le avisamos a ${patient}; como no estaba paga, no se le cobró nada.`,
              );
              cerrar();
            },
          },
        );
      }}
    >
      {appointment && (
        <>
          <p>
            Turno con {patient} del {formatLongDate(appointment.date)} a las {appointment.startTime}
            . El horario queda libre.
          </p>
          <p className="mt-2">
            {paid
              ? `${patient} ya lo pagó: va a poder elegir otro horario tuyo sin volver a pagar o pedir el reembolso del 100 %. No se le cobra ninguna penalidad.`
              : 'La reserva todavía no está paga: se cancela y se le avisa.'}
          </p>

          <div className="mt-4 grid gap-1.5">
            <label htmlFor={fieldId} className="text-sm font-semibold text-ink">
              Motivo
            </label>
            <textarea
              id={fieldId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onBlur={() => setTouched(true)}
              maxLength={MAX_REASON}
              rows={3}
              required
              placeholder="Por ejemplo: tengo un congreso ese día y no voy a estar."
              aria-invalid={touched && tooShort}
              aria-describedby={helpId}
              className={`w-full resize-y rounded-[10px] border bg-white px-4 py-3 text-sm leading-[1.6] text-ink outline-none transition-colors placeholder:text-muted-soft focus:border-brand focus-visible:ring-2 focus-visible:ring-brand ${
                touched && tooShort ? 'border-danger' : 'border-line-strong'
              }`}
            />
            <div id={helpId} className="flex justify-between gap-3 text-[12px]">
              {touched && tooShort ? (
                <span className="text-danger">
                  Contale al paciente por qué, en al menos {MIN_REASON} caracteres.
                </span>
              ) : (
                <span className="text-muted">El paciente lo ve en el aviso.</span>
              )}
              <span className="text-muted-soft" aria-live="polite">
                {reason.length}/{MAX_REASON}
              </span>
            </div>
          </div>

          {cancel.isError && (
            <p role="alert" className="mt-3 text-danger">
              {cancel.error.message}
            </p>
          )}
        </>
      )}
    </ConfirmDialog>
  );
}
