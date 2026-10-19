import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { Appointment } from '../../appointments/types/appointment';
import { usePaymentStatus } from '../hooks/usePayment';
import { paymentOutcomeOf } from '../lib/checkout';
import type { CheckoutResult } from '../types/payment';
import { Checkout } from './Checkout';

/**
 * Cuánto se espera el webhook antes de dejar de preguntar. MercadoPago suele
 * notificar en segundos; pasado esto lo más probable es un pago que tarda en
 * acreditarse (efectivo) y no tiene sentido seguir consultando cada 2 segundos.
 */
export const ESPERA_MAXIMA_MS = 60_000;

/**
 * La vuelta desde MercadoPago (ENG-63).
 *
 * **El `resultado` de la URL informa, no decide.** MercadoPago redirige al
 * paciente antes de mandar el webhook, y el turno lo confirma ese webhook
 * (ENG-64), no esta pantalla. Por eso se consulta el estado al backend hasta que
 * se mueva, y recién con el turno `CONFIRMADO` se pasa a la confirmación.
 *
 * Con `resultado=fallo` no se espera nada: se vuelve a ofrecer el pago.
 */
export function PaymentReturn({
  appointment,
  resultado,
}: {
  appointment: Appointment;
  resultado: CheckoutResult;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [intento, setIntento] = useState(0);
  const [agotado, setAgotado] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAgotado(true), ESPERA_MAXIMA_MS);
    return () => clearTimeout(timer);
  }, [intento]);

  const status = usePaymentStatus(appointment.id, resultado !== 'fallo' && !agotado, resultado);
  const outcome = status.data ? paymentOutcomeOf(status.data, resultado) : null;

  useEffect(() => {
    if (outcome !== 'CONFIRMADO') return;
    // La confirmación lee "Mis turnos": sin invalidar mostraría el turno todavía
    // sin pagar, que es lo que había en caché antes de salir a MercadoPago.
    void queryClient.invalidateQueries({ queryKey: ['appointments', 'me'] });
    navigate(`/turnos/${appointment.id}/confirmado`, { replace: true });
  }, [outcome, appointment.id, navigate, queryClient]);

  if (status.isPending || outcome === 'CONFIRMADO') {
    return (
      <p role="status" aria-live="polite" className="text-sm text-muted">
        Consultando el estado de tu pago…
      </p>
    );
  }

  if (status.isError) {
    return (
      <Aviso titulo="No pudimos consultar tu pago.">
        {status.error.message} Si pagaste, el turno se confirma igual cuando MercadoPago nos avise:
        lo vas a ver en Mis turnos.
      </Aviso>
    );
  }

  if (outcome === 'RECHAZADO') {
    return <Checkout appointment={appointment} aviso="RECHAZADO" />;
  }

  if (outcome === 'SIN_TURNO') {
    return (
      <Aviso titulo="El pago se acreditó, pero el turno ya no estaba reservado.">
        El turno se canceló o se liberó mientras pagabas, así que no lo pudimos confirmar. Guardá el
        comprobante de MercadoPago: los reembolsos de estos casos todavía se gestionan a mano.
      </Aviso>
    );
  }

  if (resultado === 'fallo') {
    return <Checkout appointment={appointment} aviso="NO_COMPLETADO" />;
  }

  return (
    <section
      aria-live="polite"
      className="max-w-[620px] rounded-[14px] border border-line bg-white p-7"
    >
      <h2 className="font-display text-[26px] leading-[1.2] text-brand-deep">
        {resultado === 'pendiente'
          ? 'Tu pago quedó pendiente.'
          : 'Estamos esperando la confirmación de MercadoPago.'}
      </h2>
      <p className="mt-2.5 text-sm leading-[1.6] text-muted">
        {resultado === 'pendiente'
          ? 'Pasa con los medios que se acreditan más tarde, como el efectivo. El turno queda confirmado solo cuando MercadoPago nos avise que se acreditó.'
          : 'Volviste de MercadoPago y en unos segundos nos llega el aviso del pago. No cierres esta pantalla.'}
      </p>

      {agotado ? (
        <div className="mt-5 grid gap-3">
          <p className="text-sm leading-[1.6] text-ink">
            Todavía no nos llegó la confirmación. Puede tardar unos minutos: el turno se confirma
            solo y lo vas a ver en Mis turnos.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setAgotado(false);
                setIntento((n) => n + 1);
              }}
              className="rounded-[9px] bg-brand px-5 py-3 text-sm font-bold text-ink-deep transition-colors hover:bg-brand-hover hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Volver a consultar
            </button>
            <IrAMisTurnos />
          </div>
        </div>
      ) : (
        <p
          role="status"
          className="mt-5 flex items-center gap-2.5 text-sm font-semibold text-brand-deep"
        >
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand motion-reduce:animate-none"
          />
          Esperando la confirmación…
        </p>
      )}
    </section>
  );
}

function Aviso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="max-w-[620px] rounded-[14px] border border-line bg-white p-7">
      <h2 className="font-display text-[26px] leading-[1.2] text-brand-deep">{titulo}</h2>
      <p className="mt-2.5 text-sm leading-[1.6] text-muted">{children}</p>
      <div className="mt-6">
        <IrAMisTurnos />
      </div>
    </section>
  );
}

function IrAMisTurnos() {
  return (
    <Link
      to="/mis-turnos"
      className="inline-flex items-center rounded-[9px] bg-brand-deep px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
    >
      Ir a mis turnos
    </Link>
  );
}
