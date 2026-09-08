import { useState } from 'react';
import { formatMonth, monthGrid, monthsInWindow } from '../lib/weeks';

/**
 * Calendario de mes completo, para elegir un día de un vistazo.
 *
 * La grilla de siete días alcanza para reservar "esta semana o la que viene",
 * que es la mayoría de los casos. Con dos meses de horizonte, llegar a mediados
 * de noviembre son ocho clicks de flecha, y en el camino no se ve nunca más de
 * una semana: quien busca "el primer martes con lugar" no tiene forma de
 * encontrarlo sin recorrerlo todo.
 *
 * Un mes entero muestra treinta días juntos, y cada uno dice si tiene lugar. La
 * decisión se toma mirando, no navegando.
 *
 * Se pinta a mano en vez de usar el `<input type="date">` del navegador porque el
 * calendario del sistema no sabe nada de la agenda: mostraría los sesenta días
 * como si todos sirvieran, y la mitad no tiene un solo horario libre. Acá los
 * días sin lugar van apagados y no se pueden elegir.
 */

/** Encabezados de la grilla, empezando en lunes. */
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;

export function MonthCalendar({
  dates,
  libresPorFecha,
  activeDate,
  onPick,
}: {
  /** Todos los días del horizonte, en orden. */
  dates: string[];
  /** Cuántos horarios reservables tiene cada día. */
  libresPorFecha: Record<string, number>;
  activeDate: string | null;
  onPick: (date: string) => void;
}) {
  const meses = monthsInWindow(dates).map((m) => m.key);
  const primero = dates[0];
  const ultimo = dates[dates.length - 1];

  // Arranca en el mes del día abierto: si el paciente ya está mirando noviembre,
  // el calendario tiene que abrirse en noviembre.
  const [mes, setMes] = useState(activeDate?.slice(0, 7) ?? meses[0]);
  const visible = meses.includes(mes) ? mes : meses[0];

  const i = meses.indexOf(visible);
  const anterior = i > 0 ? meses[i - 1] : null;
  const siguiente = i < meses.length - 1 ? meses[i + 1] : null;

  return (
    <div className="w-full max-w-[340px]">
      <div className="flex items-center justify-between gap-2">
        <FlechaMes
          label="Mes anterior"
          destino={anterior}
          onClick={() => anterior && setMes(anterior)}
        >
          ←
        </FlechaMes>

        <span className="text-[13px] font-bold capitalize text-brand-deep">
          {formatMonth(visible)} {visible.slice(0, 4)}
        </span>

        <FlechaMes
          label="Mes siguiente"
          destino={siguiente}
          onClick={() => siguiente && setMes(siguiente)}
        >
          →
        </FlechaMes>
      </div>

      <div
        aria-hidden="true"
        className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-soft"
      >
        {DIAS.map((d, n) => (
          <span key={n}>{d}</span>
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-7 gap-1">
        {monthGrid(visible).map((date, n) =>
          date === null ? (
            <span key={`hueco-${n}`} />
          ) : (
            <Dia
              key={date}
              date={date}
              libres={libresPorFecha[date] ?? 0}
              // Fuera del horizonte publicado no hay nada que ofrecer: el mes
              // asoma días que el backend todavía no publicó.
              fueraDeRango={date < primero || date > ultimo}
              activo={date === activeDate}
              onPick={onPick}
            />
          ),
        )}
      </div>

      <p className="mt-3 text-[11px] leading-snug text-muted">
        Los días en verde tienen horarios libres. Se puede reservar hasta el{' '}
        {ultimo.split('-').reverse().join('/')}.
      </p>
    </div>
  );
}

function FlechaMes({
  label,
  destino,
  onClick,
  children,
}: {
  label: string;
  destino: string | null;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={destino === null}
      onClick={onClick}
      className="rounded-[6px] border border-line-strong px-2 py-1 text-[12px] font-semibold text-muted transition-colors hover:border-brand hover:text-brand-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Dia({
  date,
  libres,
  fueraDeRango,
  activo,
  onPick,
}: {
  date: string;
  libres: number;
  fueraDeRango: boolean;
  activo: boolean;
  onPick: (date: string) => void;
}) {
  const numero = Number(date.slice(8));
  // Un día sin horarios libres no se puede elegir: llevar ahí sería mostrar una
  // fila entera en gris, que es justo lo que esta pantalla vino a evitar.
  const elegible = !fueraDeRango && libres > 0;

  return (
    <button
      type="button"
      disabled={!elegible}
      onClick={() => onPick(date)}
      aria-pressed={elegible ? activo : undefined}
      aria-label={
        fueraDeRango
          ? `${numero} — fuera del período que se puede reservar`
          : `${numero} — ${libres === 0 ? 'sin horarios libres' : `${libres} horarios libres`}`
      }
      className={`aspect-square rounded-[7px] text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
        activo
          ? 'bg-brand-deep text-white'
          : elegible
            ? 'bg-surface-teal text-brand-deep hover:bg-brand/25'
            : 'text-muted-soft'
      } ${elegible ? '' : 'cursor-not-allowed'}`}
    >
      {numero}
    </button>
  );
}
