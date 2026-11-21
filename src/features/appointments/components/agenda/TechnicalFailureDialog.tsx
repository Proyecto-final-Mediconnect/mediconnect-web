import { useId, useState } from 'react';
import { ConfirmDialog } from '../../../../shared/ui/ConfirmDialog';
import { useReportTechnicalFailure } from '../../hooks/useAppointments';
import { formatLongDate } from '../../lib/myAppointments';
import type { Appointment } from '../../types/appointment';
import { MAX_REASON, MIN_REASON } from './ProfessionalCancelDialog';

/**
 * El profesional informa que una consulta completada no se pudo hacer por una
 * falla técnica (ENG-237, ADR-018 caso 13). El turno vuelve a quedar a
 * reprogramar: el paciente elige otro horario sin volver a pagar o el
 * reembolso del 100 %. El motivo es obligatorio: el paciente lo ve en el aviso.
 *
 * Quien lo usa le pasa `key={appointment?.id}`, como en `ProfessionalCancelDialog`.
 */
export function TechnicalFailureDialog({
  appointment,
  onClose,
  onReported,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  onReported: (message: string) => void;
}) {
  const report = useReportTechnicalFailure();
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const fieldId = useId();
  const helpId = useId();

  function cerrar() {
    report.reset();
    onClose();
  }

  const trimmed = reason.trim();
  const tooShort = trimmed.length < MIN_REASON;
  const patient = appointment?.patient?.firstName ?? 'el paciente';

  return (
    <ConfirmDialog
      open={appointment !== null}
      titulo="¿La consulta no se pudo hacer?"
      confirmar={report.isPending ? 'Informando…' : 'Sí, informar la falla'}
      cancelar="Volver"
      destructivo
      pendiente={report.isPending}
      onCancel={cerrar}
      onConfirm={() => {
        setTouched(true);
        if (!appointment || tooShort) return;
        report.mutate(
          { appointmentId: appointment.id, reason: trimmed },
          {
            onSuccess: () => {
              onReported(
                `Informaste la falla técnica. Le avisamos a ${patient}: puede elegir otro horario tuyo sin volver a pagar o pedir el reembolso del 100 %.`,
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
            Consulta con {patient} del {formatLongDate(appointment.date)} a las{' '}
            {appointment.startTime}. Deja de contar como completada.
          </p>
          <p className="mt-2">
            {patient} va a poder elegir otro horario tuyo sin volver a pagar o pedir el reembolso
            del 100 %. Queda registrado en tu actividad.
          </p>

          <div className="mt-4 grid gap-1.5">
            <label htmlFor={fieldId} className="text-sm font-semibold text-ink">
              Qué pasó
            </label>
            <textarea
              id={fieldId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onBlur={() => setTouched(true)}
              maxLength={MAX_REASON}
              rows={3}
              required
              placeholder="Por ejemplo: se cortó la videollamada a los dos minutos y no pudimos volver a conectarnos."
              aria-invalid={touched && tooShort}
              aria-describedby={helpId}
              className={`w-full resize-y rounded-[10px] border bg-white px-4 py-3 text-sm leading-[1.6] text-ink outline-none transition-colors placeholder:text-muted-soft focus:border-brand focus-visible:ring-2 focus-visible:ring-brand ${
                touched && tooShort ? 'border-danger' : 'border-line-strong'
              }`}
            />
            <div id={helpId} className="flex justify-between gap-3 text-[12px]">
              {touched && tooShort ? (
                <span className="text-danger">
                  Contale al paciente qué pasó, en al menos {MIN_REASON} caracteres.
                </span>
              ) : (
                <span className="text-muted">El paciente lo ve en el aviso.</span>
              )}
              <span className="text-muted-soft" aria-live="polite">
                {reason.length}/{MAX_REASON}
              </span>
            </div>
          </div>

          {report.isError && (
            <p role="alert" className="mt-3 text-danger">
              {report.error.message}
            </p>
          )}
        </>
      )}
    </ConfirmDialog>
  );
}
