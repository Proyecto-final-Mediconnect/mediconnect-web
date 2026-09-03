import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { counterpartOf, formatLongDate } from '../../appointments/lib/myAppointments';
import { formatPrice } from '../../appointments/lib/weeks';
import type { Appointment } from '../../appointments/types/appointment';
import { useSession } from '../../auth/hooks/useSession';
import { amountLinesFor, PAYMENT_METHODS, payabilityOf } from '../lib/checkout';

/**
 * Checkout de un turno (ENG-63).
 *
 * ⚠️ **El pago está simulado.** No hay endpoint: el backend todavía no expone
 * `POST /appointments/:id/payment`, así que apretar "Pagar" no cobra nada, no
 * crea ninguna fila en `payments` y **no cambia el estado del turno**, que sigue
 * en `RESERVADO_SIN_PAGAR`. La pantalla está construida para que, cuando ENG-63
 * exista, solo haya que reemplazar `simularPago` por la mutación real.
 *
 * El diseño respeta la arquitectura decidida (ADR-013): **MediConnect no pide
 * datos de tarjeta**. El backend crea una preferencia y redirige al checkout de
 * MercadoPago, que es lo que deja a MediConnect fuera del alcance de PCI. Por eso
 * acá no hay ni va a haber campos de tarjeta, solo el resumen y el botón que
 * lleva afuera.
 */

type Estado = 'IDLE' | 'PROCESANDO' | 'RECHAZADO';

/** Lo que tarda la simulación. Es puro teatro: sirve para que el estado de
 *  "procesando" se pueda ver y estilar antes de que exista el pago real. */
const DEMORA_SIMULADA_MS = 1400;

export function Checkout({ appointment }: { appointment: Appointment }) {
  const { user } = useSession();
  const navigate = useNavigate();
  const [estado, setEstado] = useState<Estado>('IDLE');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sin esto, salir de la pantalla mientras "procesa" dejaría un navigate
  // pendiente que dispara sobre un componente ya desmontado.
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const profesional = counterpartOf(appointment, user?.id ?? null);
  const lineas = amountLinesFor(appointment);
  const pagable = payabilityOf(appointment);

  function simularPago(apruebaElPago: boolean) {
    setEstado('PROCESANDO');
    timer.current = setTimeout(() => {
      if (apruebaElPago) {
        navigate(`/turnos/${appointment.id}/confirmado`);
      } else {
        setEstado('RECHAZADO');
      }
    }, DEMORA_SIMULADA_MS);
  }

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
              Te llevamos al checkout de MercadoPago para completar el pago y volvés
              acá con el turno confirmado.{' '}
              <strong className="font-bold text-brand-deep">
                Los datos de tu tarjeta no pasan por MediConnect
              </strong>
              : se cargan del lado de MercadoPago y nosotros nunca los vemos ni los
              guardamos.
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

        {/* El aviso va acá, en el cuerpo y no escondido al pie: quien llega a
            esta pantalla tiene que saber antes de apretar nada que no se cobra
            de verdad. */}
        <section className="rounded-[14px] border border-dashed border-line-strong bg-surface p-[22px]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-bold text-brand-deep">
              El pago todavía está simulado
            </h2>
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold tracking-[0.08em] text-muted-soft">
              ENG-63
            </span>
          </div>
          <p className="mt-2 max-w-[560px] text-[13px] leading-[1.7] text-muted">
            La integración con MercadoPago no está conectada: apretar el botón no
            cobra nada y tu turno sigue{' '}
            <strong className="font-bold">reservado sin pagar</strong>. La pantalla
            existe para tener el recorrido completo armado.
          </p>
          <button
            type="button"
            onClick={() => simularPago(false)}
            disabled={estado === 'PROCESANDO'}
            className="mt-4 text-[13px] font-semibold text-muted underline underline-offset-2 hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
          >
            Simular un pago rechazado
          </button>
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
                  linea.isTotal
                    ? 'text-[13px] font-semibold text-muted'
                    : 'text-[13px] text-muted'
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
          {estado === 'RECHAZADO' && (
            <p
              role="alert"
              className="rounded-[10px] border border-danger/30 bg-danger/5 px-4 py-3 text-[13px] leading-[1.6] text-danger"
            >
              El pago fue rechazado. Tu turno sigue reservado: podés intentar de nuevo
              con otro medio.
            </p>
          )}

          <button
            type="button"
            onClick={() => simularPago(true)}
            disabled={estado === 'PROCESANDO'}
            className="w-full rounded-[10px] bg-brand py-[15px] text-[15px] font-bold text-ink-deep transition-colors hover:bg-brand-hover hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {estado === 'PROCESANDO'
              ? 'Procesando el pago…'
              : estado === 'RECHAZADO'
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
            Vas a poder cancelarlo desde “Mis turnos”. El plazo y el reembolso los
            define cada profesional.
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
