import { useParams } from 'react-router-dom';
import { useMyAppointments } from '../features/appointments/hooks/useAppointments';
import { BookingStepper } from '../features/appointments/components/BookingStepper';
import { PASO_PAGO } from '../features/appointments/lib/bookingSteps';
import { Checkout } from '../features/payments/components/Checkout';
import { findAppointment } from '../features/payments/lib/checkout';
import { DashboardLayout } from './DashboardLayout';

/**
 * Pago de un turno (ENG-63) — cuarto paso de la reserva.
 *
 * El turno sale de `GET /appointments/me`, que es real: la pantalla muestra la
 * fecha, el profesional y el precio verdaderos. Lo único simulado es el cobro,
 * y `Checkout` lo dice en pantalla.
 */
export function PaymentPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const appointments = useMyAppointments();

  const appointment = findAppointment(appointments.data ?? [], appointmentId);

  return (
    <DashboardLayout barTitle="Pagar la consulta">
      <div className="grid gap-5">
        <BookingStepper actual={PASO_PAGO} />

        {appointments.isPending ? (
          <p role="status" aria-live="polite" className="text-sm text-muted">
            Cargando el turno…
          </p>
        ) : appointments.isError ? (
          <p role="alert" className="text-danger">
            {appointments.error.message}
          </p>
        ) : appointment ? (
          <Checkout appointment={appointment} />
        ) : (
          <p className="max-w-[520px] text-sm leading-[1.6] text-muted">
            No encontramos ese turno entre los tuyos. Puede que lo hayas cancelado o
            que el enlace sea de otra cuenta.
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
