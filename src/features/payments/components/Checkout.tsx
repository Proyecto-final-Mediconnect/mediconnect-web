import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { counterpartOf, formatLongDate } from '../../appointments/lib/myAppointments';
import { formatPrice } from '../../appointments/lib/weeks';
import type { Appointment } from '../../appointments/types/appointment';
import { useSession } from '../../auth/hooks/useSession';
import { useStartCheckout } from '../hooks/usePayment';
import { amountLinesFor, PAYMENT_METHODS, payabilityOf } from '../lib/checkout';

/**
 * Checkout de un turno (ENG-63).
 *
 * "Pagar" pide al backend el link de Checkout Pro (`POST
 * /appointments/:id/payment`) y manda al paciente a MercadoPago. **MediConnect no
 * pide datos de tarjeta** (ADR-013): se cargan del lado de MercadoPago, que es lo
 * que deja a MediConnect fuera del alcance de PCI. Por eso acá no hay ni va a
 * haber campos de tarjeta, solo el resumen y el botón que lleva afuera.
 *
 * La vuelta la maneja `PaymentReturn`. Si el pago no salió, vuelve a montar este
 * componente con `aviso` para que el paciente reintente.
 */

/** Por qué se vuelve a ofrecer el pago después de un intento. */
export type CheckoutNotice = 'RECHAZADO' | 'NO_COMPLETADO';

const AVISOS: Record<CheckoutNotice, string> = {
  RECHAZADO:
    'MercadoPago rechazó el pago. Tu turno sigue reservado: podés intentar de nuevo con otro medio.',
  NO_COMPLETADO:
    'El pago no se completó. Tu turno sigue reservado: podés intentar de nuevo cuando quieras.',
};

/** Sale de la SPA: el checkout es una página de MercadoPago, no una ruta nuestra. */
function irA(url: string) {
  window.location.assign(url);
}

export function Checkout({
  appointment,
  aviso,
  redirigir = irA,
}: {
  appointment: Appointment;
  aviso?: CheckoutNotice;
  /** Inyectable para los tests, que no pueden navegar fuera de jsdom. */
  redirigir?: (url: string) => void;
}) {
  const { user } = useSession();
  const checkout = useStartCheckout();
  // Con el link en mano el navegador ya se está yendo: el botón no vuelve a
  // habilitarse, para que no se pida otro checkout en el medio.
  const yendo = checkout.isPending || checkout.isSuccess;

  // Salvo que el paciente vuelva con "atrás". Chrome y Safari restauran la
  // página del bfcache con el estado de React tal cual, así que el botón se
  // quedaba trabado en "Te llevamos a MercadoPago…" hasta recargar. Pedir el
  // link de nuevo es seguro: el backend es idempotente y no genera un segundo
  // cobro.
  useEffect(() => {
    function alVolver(event: PageTransitionEvent) {
      if (event.persisted) checkout.reset();
    }
    window.addEventListener('pageshow', alVolver);
    return () => window.removeEventListener('pageshow', alVolver);
  }, [checkout]);

  function pagar() {
    checkout.mutate(appointment.id, { onSuccess: (link) => redirigir(link.checkoutUrl) });
  }

  const profesional = counterpartOf(appointment, user?.id ?? null);
  const lineas = amountLinesFor(appointment);
  const pagable = payabilityOf(appointment);

  if (pagable.kind !== 'PAYABLE') {
    return (
      <div className="max-w-[620px] rounded-[14px] border border-line bg-white p-7">
        <h2 className="font-display text-[26px] leading-[1.2] text-brand-deep">
          {pagable.kind === 'ALREADY_PAID'
            ? 'Este turno ya está confirmado.'
            : 'Este turno no se puede pagar.'}
        </h2>
        <p className="mt-2.5 text-sm leading-[1.6] text-muted">
          {pagable.kind === 'ALREADY_PAID'
            ? 'El pago ya se acreditó. No hace falta que hagas nada más.'
            : pagable.reason}
        </p>
        <Link
          to="/mis-turnos"
          className="mt-6 inline-flex items-center rounded-[9px] bg-brand-deep px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          Volver a mis turnos
        </Link>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
      <div className="grid gap-5">
        <section
          aria-labelledby="medio-pago"
          className="overflow-hidden rounded-[14px] border border-line bg-white"
        >
          <header className="border-b border-line-soft px-[22px] py-[18px]">
            <h2
              id="medio-pago"
              className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
            >
              Cómo vas a pagar
            </h2>
          </header>

          <div className="px-[22px] py-[22px]">
            <p className="font-display text-[26px] leading-[1.2] text-brand-deep">
              Con MercadoPago
            </p>
            <p className="mt-2.5 max-w-[520px] text-sm leading-[1.7] text-muted">
              Te llevamos al checkout de MercadoPago para completar el pago y volvés acá con el
              turno confirmado.{' '}
              <strong className="font-bold text-brand-deep">
                Los datos de tu tarjeta no pasan por MediConnect
              </strong>
              : se cargan del lado de MercadoPago y nosotros nunca los vemos ni los guardamos.
            </p>

            <ul className="mt-5 flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((metodo) => (
                <li
                  key={metodo}
                  className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-[12px] font-semibold text-muted"
                >
                  {metodo}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          aria-labelledby="resumen-turno"
          className="overflow-hidden rounded-[14px] border border-line bg-white"
        >
          <header className="border-b border-line-soft px-[22px] py-[18px]">
            <h2
              id="resumen-turno"
              className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
            >
              Qué estás pagando
            </h2>
          </header>

          <dl className="grid gap-[11px] px-[22px] py-[18px] text-sm font-medium text-ink">
            <Fila titulo="Profesional">
              {profesional ? `${profesional.firstName} ${profesional.lastName}` : 'No disponible'}
            </Fila>
            <Fila titulo="Fecha">{formatLongDate(appointment.date)}</Fila>
            <Fila titulo="Hora">
              <span className="font-bold text-brand-deep">{appointment.startTime}</span>
            </Fila>
            <Fila titulo="Duración">{appointment.durationMinutes} min</Fila>
            <Fila titulo="Modalidad">Videoconsulta</Fila>
          </dl>
        </section>
      </div>

      <aside className="overflow-hidden rounded-[14px] border border-line bg-white lg:sticky lg:top-24">
        <header className="border-b border-line-soft px-[22px] py-[18px]">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Detalle del importe
          </h2>
        </header>

        <dl className="grid gap-3 px-[22px] py-[18px]">
          {lineas.map((linea) => (
            <div
              key={linea.label}
              className={`flex items-baseline justify-between gap-3 ${
                linea.isTotal ? 'border-t border-line-soft pt-3.5' : ''
              }`}
            >
              <dt
                className={
                  linea.isTotal ? 'text-[13px] font-semibold text-muted' : 'text-[13px] text-muted'
                }
              >
                {linea.label}
              </dt>
              <dd
                className={
                  linea.isTotal
                    ? 'text-[28px] font-bold text-brand-deep'
                    : 'text-sm font-semibold text-ink'
                }
              >
                {formatPrice(linea.amount, appointment.currency)}
              </dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-3.5 border-t border-line-soft px-[22px] py-[18px]">
          {checkout.isError ? (
            <p
              role="alert"
              className="rounded-[10px] border border-danger/30 bg-danger/5 px-4 py-3 text-[13px] leading-[1.6] text-danger"
            >
              {checkout.error.message}
            </p>
          ) : aviso && !yendo ? (
            <p
              role="alert"
              className="rounded-[10px] border border-danger/30 bg-danger/5 px-4 py-3 text-[13px] leading-[1.6] text-danger"
            >
              {AVISOS[aviso]}
            </p>
          ) : null}

          <button
            type="button"
            onClick={pagar}
            disabled={yendo}
            className="w-full rounded-[10px] bg-brand py-[15px] text-[15px] font-bold text-ink-deep transition-colors hover:bg-brand-hover hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {yendo
              ? 'Te llevamos a MercadoPago…'
              : aviso || checkout.isError
                ? 'Reintentar el pago'
                : `Pagar ${formatPrice(appointment.price, appointment.currency)}`}
          </button>

          <Link
            to="/mis-turnos"
            className="text-center text-[13px] font-semibold text-muted underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Pagar más tarde
          </Link>

          <p className="text-xs leading-[1.6] text-muted-soft">
            Tenés <strong className="font-semibold">15 minutos</strong> desde que reservaste para
            pagarlo: después el horario se libera y vuelve a estar disponible para otra persona. Vas
            a poder cancelarlo desde “Mis turnos”. El plazo y el reembolso los define cada
            profesional.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Fila({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{titulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}
