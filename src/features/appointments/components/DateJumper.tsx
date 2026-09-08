import { useId, useState } from 'react';
import { MonthCalendar } from './MonthCalendar';

/**
 * Botón que despliega el calendario del mes para saltar a un día.
 *
 * Con 28 días de agenda, ir de a siete alcanzaba. Con dos meses son nueve
 * páginas, y recorrerlas de a una es incómodo: quien busca "el primer martes con
 * lugar" no lo encuentra sin pasar por todas.
 *
 * Va plegado porque la mayoría de las reservas son para los próximos días y no
 * necesitan nada de esto: desplegado siempre, el calendario compite con la
 * grilla, que es lo que la pantalla vino a mostrar.
 *
 * Es un `<button>` con `aria-expanded` sobre un bloque que aparece debajo, no un
 * popover flotante: no hay que administrar foco ni clicks afuera, funciona con
 * teclado sin escribir nada, y al empujar el contenido hacia abajo nunca tapa la
 * grilla que se está por usar.
 */
export function DateJumper({
  dates,
  libresPorFecha,
  activeDate,
  onJump,
}: {
  /** Todos los días del horizonte, en orden. */
  dates: string[];
  /** Cuántos horarios reservables tiene cada día. */
  libresPorFecha: Record<string, number>;
  activeDate: string | null;
  onJump: (date: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const panelId = useId();

  if (dates.length === 0) return null;

  return (
    <div className="mt-4">
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls={panelId}
        onClick={() => setAbierto((v) => !v)}
        className={`flex items-center gap-2 rounded-[8px] border px-3 py-1.5 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
          abierto
            ? 'border-brand bg-surface-teal text-brand-deep'
            : 'border-line-strong text-muted hover:border-brand hover:text-brand-deep'
        }`}
      >
        <IconCalendario />
        Ver calendario
      </button>

      {/* Se desmonta al cerrar para que el calendario vuelva a abrirse en el mes
          del día que esté seleccionado, y no en el último que se estuvo
          hojeando. */}
      {abierto && (
        <div
          id={panelId}
          className="mt-3 inline-block rounded-[10px] border border-line bg-surface px-4 py-3.5"
        >
          <MonthCalendar
            dates={dates}
            libresPorFecha={libresPorFecha}
            activeDate={activeDate}
            onPick={(date) => {
              onJump(date);
              // Elegir un día es una decisión tomada: dejar el panel abierto solo
              // taparía la grilla de horarios que se venía a ver.
              setAbierto(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function IconCalendario() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}
