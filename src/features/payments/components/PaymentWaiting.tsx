import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { formatPrice } from '../../appointments/lib/weeks';
import type { Appointment } from '../../appointments/types/appointment';
import { useNow } from '../../../shared/hooks/useNow';
import { usePaymentStatus } from '../hooks/usePayment';
import { paymentOutcomeOf } from '../lib/checkout';
import { escucharVueltas } from '../lib/checkoutTab';
import { formatRestante, restanteParaPagar } from '../lib/waiting';
import type { CheckoutResult } from '../types/payment';
import type { CheckoutNotice } from './Checkout';

/**
 * La pestaña de MediConnect mientras el paciente paga en la de MercadoPago
 * (ENG-199).
 *
 * Pregunta el estado aunque esté en segundo plano y, si la pestaña de vuelta
 * avisa, pregunta en el momento. Con el turno `CONFIRMADO` pasa sola a "Listo".
 * Igual que `PaymentReturn`, **no confirma nada por su cuenta**: lo confirma el
 * webhook.
 */
export function PaymentWaiting({
  appointment,
  checkoutUrl,
  onReabrir,
  onPagarAca,
  onNoSalio,
}: {
  appointment: Appointment;
  checkoutUrl: string;
  onReabrir: (url: string) => void;
  onPagarAca: (url: string) => void;
  onNoSalio: (aviso: CheckoutNotice) => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const now = useNow(1_000);
  // Lo que contó la pestaña de vuelta. Sin noticias se espera como un éxito:
  // un `RECHAZADO` de un intento anterior no tiene que cortar esta espera.
  const [resultado, setResultado] = useState<CheckoutResult>('exito');

  const status = usePaymentStatus(appointment.id, true, resultado, true);
  const outcome = status.data ? paymentOutcomeOf(status.data, resultado) : null;
  const { refetch } = status;

  useEffect(
    () =>
      escucharVueltas((vuelta) => {
        if (vuelta.appointmentId !== appointment.id) return;
        setResultado(vuelta.resultado);
        void refetch();
      }),
    [appointment.id, refetch],
  );

  useEffect(() => {
    if (outcome === 'CONFIRMADO') {
      void queryClient.invalidateQueries({ queryKey: ['appointments', 'me'] });
      navigate(`/turnos/${appointment.id}/confirmado`, { replace: true });
    } else if (outcome === 'RECHAZADO') {
      onNoSalio('RECHAZADO');
    } else if (resultado === 'fallo' && outcome === 'ESPERANDO') {
      onNoSalio('NO_COMPLETADO');
    }
  }, [outcome, resultado, appointment.id, navigate, queryClient, onNoSalio]);

  const restante = restanteParaPagar(appointment.createdAt, now);

  return (
    <section
      aria-labelledby="esperando-pago"
      aria-live="polite"
      className="grid gap-5 rounded-[14px] border border-night bg-night p-7 text-white lg:p-9"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand-bright motion-reduce:animate-none"
        />
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-bright">
          Esperando el pago
        </p>
      </div>

      <div>
        <h2
          id="esperando-pago"
          className="font-display text-[30px] leading-[1.1] text-white lg:text-[38px]"
        >
          Completá el pago en la pestaña de MercadoPago.
        </h2>
        <p className="mt-4 max-w-[540px] text-[15px] leading-[1.7] text-on-night">
          Cuando MercadoPago nos avise que se acreditó{' '}
          <strong className="font-bold text-white">
            {formatPrice(appointment.price, appointment.currency)}
          </strong>
          , esta pantalla pasa sola a la confirmación. No hace falta que vuelvas a cargar nada.
        </p>
      </div>

      {restante !== null && (
        <p className="text-sm text-on-night-strong">
          {restante > 0 ? (
            <>
              Te quedan{' '}
              <strong className="font-bold tabular-nums text-white">
                {formatRestante(restante)}
              </strong>{' '}
              para pagar antes de que se libere el horario.
            </>
          ) : (
            'Se terminó el tiempo para pagar: si no llegaste, el horario se libera en breve.'
          )}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onReabrir(checkoutUrl)}
          className="inline-flex items-center rounded-[9px] bg-brand px-5 py-3 text-sm font-bold text-ink-deep transition-colors hover:bg-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright focus-visible:ring-offset-2 focus-visible:ring-offset-night"
        >
          Volver a abrir MercadoPago
        </button>
        <button
          type="button"
          onClick={() => onPagarAca(checkoutUrl)}
          className="inline-flex items-center rounded-[9px] border border-white/25 px-5 py-3 text-sm font-bold text-white transition-colors hover:border-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright focus-visible:ring-offset-2 focus-visible:ring-offset-night"
        >
          Pagar en esta pestaña
        </button>
      </div>

      <Link
        to="/mis-turnos"
        className="justify-self-start text-[13px] font-semibold text-on-night-soft underline-offset-2 hover:text-white hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright"
      >
        Pagar más tarde
      </Link>
    </section>
  );
}
