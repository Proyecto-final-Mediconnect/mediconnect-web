import { Link, useParams } from 'react-router-dom';
import { BookingStepper } from '../features/appointments/components/BookingStepper';
import { PASO_LISTO } from '../features/appointments/lib/bookingSteps';
import { useMyAppointments } from '../features/appointments/hooks/useAppointments';
import { counterpartOf, formatLongDate } from '../features/appointments/lib/myAppointments';
import { formatPrice } from '../features/appointments/lib/weeks';
import { useSession } from '../features/auth/hooks/useSession';
import { PaymentReceipt } from '../features/payments/components/PaymentReceipt';
import { usePaymentStatus } from '../features/payments/hooks/usePayment';
import { findAppointment } from '../features/payments/lib/checkout';
import { DeviceCheck } from '../features/video/components/DeviceCheck';
import { JOIN_OPENS_MINUTES_BEFORE } from '../features/video/lib/joinWindow';
import { DashboardLayout } from './DashboardLayout';

/**
 * Turno confirmado (ENG-64) — último paso de la reserva, con el comprobante del
 * pago (ENG-199).
 *
 * Se llega cuando el webhook pasó el turno a `CONFIRMADO`: desde la pestaña que
 * esperaba el pago (`PaymentWaiting`) o desde la vuelta de MercadoPago
 * (`PaymentReturn`). La ruta se puede abrir a mano, así que solo dice "pago
 * acreditado" si el backend lo confirma: si no, muestra el estado real.
 */
export function AppointmentConfirmedPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user } = useSession();
  const appointments = useMyAppointments();
  const payment = usePaymentStatus(appointmentId ?? '', false);

  const appointment = findAppointment(appointments.data ?? [], appointmentId);
  const profesional = appointment ? counterpartOf(appointment, user?.id ?? null) : null;
  const confirmado = appointment?.status === 'CONFIRMADO';
  const receipt = payment.data?.receipt ?? null;

  return (
    <DashboardLayout barTitle="Turno confirmado">
      <div className="grid gap-5">
        <BookingStepper actual={PASO_LISTO} />

        {appointments.isPending ? (
          <p role="status" aria-live="polite" className="text-sm text-muted">
            Cargando el turno…
          </p>
        ) : !appointment ? (
          <p className="max-w-[520px] text-sm leading-[1.6] text-muted">
            No encontramos ese turno entre los tuyos.
          </p>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="grid gap-5">
              <article className="rounded-[14px] border border-night bg-night p-7 text-white lg:p-9">
                <div className="flex items-center gap-3">
                  {confirmado && (
                    <span
                      aria-hidden="true"
                      className="confirmado-check grid h-9 w-9 place-items-center rounded-full bg-brand text-lg font-bold text-ink-deep"
                    >
                      ✓
                    </span>
                  )}
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-bright">
                    {confirmado && receipt ? 'Pago acreditado' : 'Listo'}
                  </p>
                </div>
                <h2 className="font-display mt-4 text-[34px] leading-[1.08] text-white lg:text-[44px]">
                  {confirmado ? 'Tu turno está confirmado.' : 'Tu consulta quedó agendada.'}
                </h2>
                <p className="mt-4 max-w-[540px] text-[15px] leading-[1.7] text-on-night">
                  {receipt && (
                    <>
                      Recibimos tu pago de{' '}
                      <strong className="font-bold text-white">
                        {formatPrice(receipt.amount, receipt.currency)}
                      </strong>
                      .{' '}
                    </>
                  )}
                  {profesional
                    ? `${profesional.firstName} ${profesional.lastName} te espera el `
                    : 'Te esperamos el '}
                  <strong className="font-bold text-white">
                    {formatLongDate(appointment.date)} a las {appointment.startTime}
                  </strong>
                  .
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    to={`/turnos/${appointment.id}`}
                    className="inline-flex items-center rounded-[9px] bg-brand px-5 py-3 text-sm font-bold text-ink-deep transition-colors hover:bg-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright focus-visible:ring-offset-2 focus-visible:ring-offset-night"
                  >
                    Ver mi turno
                  </Link>
                  <Link
                    to="/mis-turnos"
                    className="inline-flex items-center rounded-[9px] border border-white/25 px-5 py-3 text-sm font-bold text-white transition-colors hover:border-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright focus-visible:ring-offset-2 focus-visible:ring-offset-night"
                  >
                    Ir a Mis turnos
                  </Link>
                </div>
              </article>

              {confirmado && (
                <section
                  aria-labelledby="que-sigue"
                  className="rounded-[14px] border border-line bg-white p-6"
                >
                  <h2
                    id="que-sigue"
                    className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
                  >
                    Qué sigue
                  </h2>
                  <ul className="mt-4 grid gap-4 text-sm leading-[1.6] text-ink">
                    <Paso titulo="La sala se abre antes">
                      Podés entrar a la videoconsulta {JOIN_OPENS_MINUTES_BEFORE} minutos antes del
                      horario, desde el turno o desde Mis turnos.
                    </Paso>
                    <Paso titulo="Probá tu cámara y tu micrófono">
                      Hacelo antes del día, en una sala de prueba, así no perdés tiempo de la
                      consulta.
                      <div className="mt-3">
                        <DeviceCheck />
                      </div>
                    </Paso>
                    <Paso titulo="Si no podés ir">
                      Cancelalo o reprogramalo desde el turno. Lo que se devuelve depende de la
                      anticipación y de la política del profesional.
                    </Paso>
                  </ul>
                </section>
              )}
            </div>

            <aside className="grid gap-4 lg:sticky lg:top-24">
              {receipt && (
                <PaymentReceipt receipt={receipt} confirmedAt={payment.data?.confirmedAt} />
              )}
              <section className="overflow-hidden rounded-[14px] border border-line bg-white">
                <header className="border-b border-line-soft px-[22px] py-[18px]">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                    El turno
                  </h2>
                </header>
                <dl className="grid gap-[11px] px-[22px] py-[18px] text-sm font-medium text-ink">
                  <Fila titulo="Profesional">
                    {profesional
                      ? `${profesional.firstName} ${profesional.lastName}`
                      : 'No disponible'}
                  </Fila>
                  <Fila titulo="Fecha">{formatLongDate(appointment.date)}</Fila>
                  <Fila titulo="Hora">
                    <span className="font-bold text-brand-deep">{appointment.startTime}</span>
                  </Fila>
                  <Fila titulo="Duración">{appointment.durationMinutes} min</Fila>
                  <Fila titulo="Modalidad">Videoconsulta</Fila>
                </dl>
              </section>
            </aside>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function Paso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[18px_1fr] gap-3">
      <span aria-hidden="true" className="mt-1.5 h-2 w-2 rounded-full bg-brand" />
      <div>
        <p className="font-bold text-brand-deep">{titulo}</p>
        <div className="text-muted">{children}</div>
      </div>
    </li>
  );
}

function Fila({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{titulo}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
