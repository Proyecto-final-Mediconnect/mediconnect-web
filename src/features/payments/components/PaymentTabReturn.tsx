import { useEffect } from 'react';
import { avisarVuelta, olvidarPagoEnPestana } from '../lib/checkoutTab';
import type { CheckoutResult } from '../types/payment';

/**
 * La pestaña de MercadoPago cuando vuelve a MediConnect (ENG-199).
 *
 * La confirmación se muestra en la pestaña donde el paciente empezó, que se
 * queda esperando. Esta solo le avisa que volvió y trata de cerrarse; si el
 * navegador no la deja, ofrece cerrarla a mano o seguir acá.
 */
export function PaymentTabReturn({
  appointmentId,
  resultado,
  onSeguirAca,
  cerrar = () => window.close(),
}: {
  appointmentId: string;
  resultado: CheckoutResult;
  onSeguirAca: () => void;
  /** Inyectable para los tests. */
  cerrar?: () => void;
}) {
  useEffect(() => {
    avisarVuelta({ appointmentId, resultado });
    olvidarPagoEnPestana(appointmentId);
    // Un instante para que el aviso salga antes de cerrar.
    const timer = setTimeout(cerrar, 600);
    return () => clearTimeout(timer);
  }, [appointmentId, resultado, cerrar]);

  const salio = resultado !== 'fallo';

  return (
    <section
      aria-live="polite"
      className="mx-auto mt-10 grid max-w-[520px] justify-items-center gap-4 rounded-[16px] border border-line bg-white p-8 text-center"
    >
      <span
        aria-hidden="true"
        className={`grid h-14 w-14 place-items-center rounded-full text-2xl font-bold ${
          salio ? 'bg-surface-teal text-brand-hover' : 'bg-danger/10 text-danger'
        }`}
      >
        {salio ? '✓' : '!'}
      </span>
      <h1 className="font-display text-[28px] leading-[1.15] text-brand-deep">
        {salio ? 'Listo, ya podés cerrar esta pestaña.' : 'El pago no se completó.'}
      </h1>
      <p className="text-sm leading-[1.7] text-muted">
        {salio
          ? 'Volvé a la pestaña de MediConnect donde empezaste: ahí vas a ver la confirmación del pago y de tu turno.'
          : 'Volvé a la pestaña de MediConnect donde empezaste para intentarlo de nuevo. Tu turno sigue reservado.'}
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={cerrar}
          className="rounded-[9px] bg-brand-deep px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          Cerrar esta pestaña
        </button>
        <button
          type="button"
          onClick={onSeguirAca}
          className="rounded-[9px] border border-line-strong px-5 py-3 text-sm font-bold text-brand-deep transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          Seguir en esta pestaña
        </button>
      </div>
    </section>
  );
}
