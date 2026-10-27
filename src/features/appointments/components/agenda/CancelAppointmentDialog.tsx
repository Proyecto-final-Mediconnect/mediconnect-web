import { RefundEstimate } from '../../../cancellation-policy/components/RefundEstimate';
import { refundOutcomeText } from '../../../cancellation-policy/lib/policy';
import { useCancelAppointment } from '../../hooks/useAppointments';
import { formatLongDate } from '../../lib/myAppointments';
import { formatPrice } from '../../lib/weeks';
import type { Appointment } from '../../types/appointment';
import { ConfirmDialog } from '../../../../shared/ui/ConfirmDialog';

/**
 * Confirmación de cancelar un turno (ENG-178), con lo que se devuelve si está
 * pagado (ENG-65). La comparten la lista y el detalle. `onCancelled` recibe qué
 * pasó con la devolución, para mostrarlo después de cerrar.
 */
export function CancelAppointmentDialog({
  appointment,
  now,
  onClose,
  onCancelled,
}: {
  appointment: Appointment | null;
  now: Date;
  onClose: () => void;
  onCancelled: (refundOutcome: string | null) => void;
}) {
  const cancel = useCancelAppointment();

  function cerrar() {
    cancel.reset();
    onClose();
  }

  return (
    <ConfirmDialog
      open={appointment !== null}
      titulo="¿Cancelar el turno?"
      confirmar={cancel.isPending ? 'Cancelando…' : 'Sí, cancelar'}
      cancelar="Mantener el turno"
      destructivo
      pendiente={cancel.isPending}
      onCancel={cerrar}
      onConfirm={() => {
        if (!appointment) return;
        cancel.mutate(appointment.id, {
          onSuccess: (cancelled) => {
            onCancelled(
              refundOutcomeText(cancelled.refund, (amount) =>
                formatPrice(amount, cancelled.currency),
              ),
            );
            cerrar();
          },
        });
      }}
    >
      {appointment && (
        <>
          <p>
            Se cancela tu turno del {formatLongDate(appointment.date)} a las {appointment.startTime}
            , y el horario queda libre para otra persona.
          </p>
          {appointment.status === 'CONFIRMADO' && appointment.professional && (
            <RefundEstimate
              appointmentId={appointment.id}
              professionalId={appointment.professional.id}
              scheduledAt={appointment.scheduledAt}
              price={appointment.price}
              currency={appointment.currency}
              now={now}
              className="mt-3 text-ink"
            />
          )}
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
