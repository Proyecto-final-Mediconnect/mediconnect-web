import { PASOS } from '../lib/bookingSteps';

/** Barra de progreso de la reserva. Los pasos y sus números viven en
 *  `lib/bookingSteps`, que es de donde los toman las tres pantallas. */
export function BookingStepper({ actual }: { actual: number }) {
  return (
    <ol className="flex max-w-[640px] justify-between rounded-[14px] border border-line bg-white px-7 py-[22px]">
      {PASOS.map((paso, i) => {
        const n = i + 1;
        const hecho = n < actual;
        const activo = n === actual;

        return (
          <li key={paso} className="grid justify-items-center gap-[7px]">
            <span
              aria-hidden="true"
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                hecho
                  ? 'bg-brand-hover text-white'
                  : activo
                    ? 'bg-brand-deep text-white'
                    : 'bg-line-soft text-muted-soft'
              }`}
            >
              {hecho ? '✓' : n}
            </span>
            <span
              className={`text-[11px] font-semibold tracking-[0.04em] ${
                activo ? 'text-brand-deep' : 'text-muted-soft'
              }`}
            >
              {paso}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
