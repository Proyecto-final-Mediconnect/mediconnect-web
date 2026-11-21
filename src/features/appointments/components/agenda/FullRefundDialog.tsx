import { refundOutcomeText } from '../../../cancellation-policy/lib/policy';
import { ConfirmDialog } from '../../../../shared/ui/ConfirmDialog';
import { useRequestFullRefund } from '../../hooks/useAppointments';
import { formatPrice } from '../../lib/weeks';
import type { Appointment } from '../../types/appointment';

/**
 * El paciente elige el reembolso del 100 % de un turno que el profesional
 * canceló (ENG-204, ADR-018). No tiene vuelta atrás: el turno queda cancelado.
 */
export function FullRefundDialog({
  appointment,
  onClose,
  onRefunded,
}: {
  appointment: Appointment | null;
  onClose: () => void;
  /** Qué pasó con la devolución, para mostrarlo después de cerrar. */
  onRefunded: (message: string | null) => void;
}) {
  const refund = useRequestFullRefund();

  function cerrar() {
    refund.reset();
    onClose();
  }

  return (
    <ConfirmDialog
      open={appointment !== null}
      titulo="¿Pedir el reembolso del 100 %?"
      confirmar={refund.isPending ? 'Pidiendo…' : 'Sí, quiero el reembolso'}
      cancelar="Volver"
      pendiente={refund.isPending}
      onCancel={cerrar}
      onConfirm={() => {
        if (!appointment) return;
        refund.mutate(appointment.id, {
          onSuccess: (result) => {
            onRefunded(
              refundOutcomeText(result.refund, (amount) =>
                formatPrice(amount, appointment.currency),
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
            Te devolvemos {formatPrice(appointment.price, appointment.currency)}, todo lo que
            pagaste, al mismo medio de pago. El turno queda cancelado.
          </p>
          <p className="mt-2 text-muted">
            Si preferís atenderte igual, podés volver a reservar cuando quieras.
          </p>
          {refund.isError && (
            <p role="alert" className="mt-3 text-danger">
              {refund.error.message}
            </p>
          )}
        </>
      )}
    </ConfirmDialog>
  );
}
