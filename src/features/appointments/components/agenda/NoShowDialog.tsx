import { ConfirmDialog } from '../../../../shared/ui/ConfirmDialog';
import { useMarkNoShow } from '../../hooks/useAppointments';
import type { Appointment } from '../../types/appointment';

/**
 * Confirmación de "el paciente no se presentó" (ENG-189). Es del profesional y
 * no tiene vuelta atrás desde la pantalla: el turno queda como no asistió y no
 * se reembolsa.
 */
export function NoShowDialog({
  appointment,
  onClose,
}: {
  appointment: Appointment | null;
  onClose: () => void;
}) {
  const noShow = useMarkNoShow();

  function cerrar() {
    noShow.reset();
    onClose();
  }

  return (
    <ConfirmDialog
      open={appointment !== null}
      titulo="¿El paciente no se presentó?"
      confirmar={noShow.isPending ? 'Marcando…' : 'Sí, no asistió'}
      cancelar="Volver"
      destructivo
      pendiente={noShow.isPending}
      onCancel={cerrar}
      onConfirm={() => {
        if (!appointment) return;
        noShow.mutate(appointment.id, { onSuccess: cerrar });
      }}
    >
      <p>El turno queda como no asistió y no se reembolsa.</p>
      {noShow.isError && (
        <p role="alert" className="mt-3 text-danger">
          {noShow.error.message}
        </p>
      )}
    </ConfirmDialog>
  );
}
