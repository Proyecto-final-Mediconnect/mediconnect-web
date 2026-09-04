import { Link, useParams } from 'react-router-dom';
import { BookingStepper } from '../features/appointments/components/BookingStepper';
import { PASO_LISTO } from '../features/appointments/lib/bookingSteps';
import { useMyAppointments } from '../features/appointments/hooks/useAppointments';
import { counterpartOf, formatLongDate, statusLabel } from '../features/appointments/lib/myAppointments';
import { formatPrice } from '../features/appointments/lib/weeks';
import { useSession } from '../features/auth/hooks/useSession';
import { findAppointment } from '../features/payments/lib/checkout';
import { JOIN_OPENS_MINUTES_BEFORE } from '../features/video/lib/joinWindow';
import { DashboardLayout } from './DashboardLayout';

/**
 * Turno confirmado (ENG-64) — último paso de la reserva.
 *
 * ⚠️ Se llega desde el pago simulado, así que **el turno no está realmente
 * confirmado**: en la base sigue en `RESERVADO_SIN_PAGAR`. Por eso la pantalla
 * muestra el estado real del turno junto al mensaje, en vez de afirmar algo que
 * la base contradice. Cuando ENG-63 conecte MercadoPago, el estado que llegue
 * del backend va a ser `CONFIRMADO` y este mismo chip lo va a decir solo.
 */
export function AppointmentConfirmedPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const { user } = useSession();
  const appointments = useMyAppointments();

  const appointment = findAppointment(appointments.data ?? [], appointmentId);
  const profesional = appointment ? counterpartOf(appointment, user?.id ?? null) : null;

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
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
            <article className="rounded-[14px] border border-night bg-night p-7 text-white lg:p-9">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-bright">
                Listo
              </p>
              <h2 className="font-display mt-3 text-[34px] leading-[1.08] text-white lg:text-[44px]">
                Tu consulta quedó agendada.
              </h2>
              <p className="mt-4 max-w-[520px] text-[15px] leading-[1.7] text-on-night">
                {profesional
                  ? `${profesional.firstName} ${profesional.lastName} te espera el `
                  : 'Te esperamos el '}
                <strong className="font-bold text-white">
                  {formatLongDate(appointment.date)} a las {appointment.startTime}
                </strong>
                . La sala de la videoconsulta se abre {JOIN_OPENS_MINUTES_BEFORE} minutos
                antes; vas a encontrar el acceso en Mis turnos.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/mis-turnos"
                  className="inline-flex items-center rounded-[9px] bg-brand px-5 py-3 text-sm font-bold text-ink-deep transition-colors hover:bg-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright focus-visible:ring-offset-2 focus-visible:ring-offset-night"
                >
                  Ver mis turnos
                </Link>
                <Link
                  to="/paciente"
                  className="inline-flex items-center rounded-[9px] border border-white/25 px-5 py-3 text-sm font-bold text-white transition-colors hover:border-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright focus-visible:ring-offset-2 focus-visible:ring-offset-night"
                >
                  Volver al panel
                </Link>
              </div>
            </article>

            <aside className="grid gap-4">
              <section className="overflow-hidden rounded-[14px] border border-line bg-white">
                <header className="border-b border-line-soft px-[22px] py-[18px]">
                  <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                    El turno
                  </h2>
                </header>
                <dl className="grid gap-[11px] px-[22px] py-[18px] text-sm font-medium text-ink">
                  <Fila titulo="Fecha">{formatLongDate(appointment.date)}</Fila>
                  <Fila titulo="Hora">
                    <span className="font-bold text-brand-deep">
                      {appointment.startTime}
                    </span>
                  </Fila>
                  <Fila titulo="Duración">{appointment.durationMinutes} min</Fila>
                  <Fila titulo="Importe">
                    {formatPrice(appointment.price, appointment.currency)}
                  </Fila>
                  <Fila titulo="Estado">
                    {/* El estado sale del backend, no de esta pantalla: hasta que
                        exista el pago va a seguir diciendo "Reservado (sin pagar)". */}
                    <span className="rounded-full bg-surface-teal px-2.5 py-1 text-xs font-semibold text-brand-hover">
                      {statusLabel(appointment.status)}
                    </span>
                  </Fila>
                </dl>
              </section>

              {appointment.status === 'RESERVADO_SIN_PAGAR' && (
                <p className="rounded-[14px] border border-dashed border-line-strong bg-surface px-[22px] py-4 text-[13px] leading-[1.7] text-muted">
                  El pago fue simulado: el turno sigue reservado sin pagar hasta que
                  ENG-63 conecte MercadoPago.
                </p>
              )}
            </aside>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function Fila({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{titulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}
