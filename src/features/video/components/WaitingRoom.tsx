import { Link } from 'react-router-dom';
import { formatLongDate } from '../../appointments/lib/myAppointments';
import type { Appointment } from '../../appointments/types/appointment';
import { formatElapsed } from '../lib/elapsed';
import { JOIN_OPENS_MINUTES_BEFORE, timeUntilOpen } from '../lib/joinWindow';

/**
 * Sala de espera de la videoconsulta (ENG-56).
 *
 * Antes, entrar antes de hora era un error: la pantalla pedía la sala apenas se
 * montaba, el backend contestaba 409 —"la sala se abre 10 minutos antes"— y el
 * paciente veía un cartel rojo. Técnicamente correcto y pésimo: llegar temprano a
 * una consulta médica es lo que hace la gente, no un error.
 *
 * Ahora se entra siempre y se espera acá. **No se pide la sala hasta que la
 * ventana abre**, así que llegar temprano ya no genera un 409 ni intenta crear
 * una sala en Daily, que se factura por minuto.
 *
 * El ingreso es automático: el reloj corre solo y cuando llega la hora la
 * pantalla pasa a la consulta sin que haya que apretar nada ni recargar. Quien
 * llegó diez minutos antes y dejó la pestaña abierta es justamente el que no
 * tiene que estar mirando un botón.
 */

type WaitingRoomProps = {
  appointment: Appointment;
  /** A partir de cuándo se puede entrar. */
  opensAt: Date;
  now: Date;
  counterpartName: string;
  /** "Profesional" o "Paciente", según quién esté mirando. */
  counterpartLabel: string;
};

/** Debajo de esto se muestra una cuenta regresiva viva; por encima, texto. Una
 *  hora es donde "faltan 59:12" empieza a ser más útil que "en una hora". */
const CUENTA_REGRESIVA_MS = 60 * 60_000;

export function WaitingRoom({
  appointment,
  opensAt,
  now,
  counterpartName,
  counterpartLabel,
}: WaitingRoomProps) {
  const falta = opensAt.getTime() - now.getTime();
  const cerca = falta < CUENTA_REGRESIVA_MS;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <article className="rounded-[14px] border border-night bg-night p-7 text-white lg:p-9">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-bright">
          Sala de espera
        </p>

        {cerca ? (
          <>
            <p
              role="timer"
              aria-label={`La sala se abre en ${formatElapsed(falta)}`}
              className="font-display mt-3 text-[52px] leading-none tabular-nums text-white lg:text-[66px]"
            >
              {formatElapsed(falta)}
            </p>
            <p className="mt-3 text-[15px] text-on-night">
              para que se abra la sala. Vas a entrar automáticamente, no hace falta que
              recargues.
            </p>
          </>
        ) : (
          <>
            <h2 className="font-display mt-3 text-[30px] leading-[1.1] text-white lg:text-[38px]">
              Tu consulta es el {formatLongDate(appointment.date)} a las{' '}
              {appointment.startTime}.
            </h2>
            <p className="mt-3 text-[15px] text-on-night">
              La sala se abre {timeUntilOpen(opensAt, now)}, {JOIN_OPENS_MINUTES_BEFORE} minutos
              antes del turno.
            </p>
          </>
        )}

        <dl className="mt-7 grid gap-2.5 border-t border-white/10 pt-6 text-sm">
          <Fila titulo={counterpartLabel}>{counterpartName}</Fila>
          <Fila titulo="Fecha">{formatLongDate(appointment.date)}</Fila>
          <Fila titulo="Hora">
            <span className="font-bold text-white">{appointment.startTime}</span>
          </Fila>
          <Fila titulo="Duración">{appointment.durationMinutes} min</Fila>
        </dl>

        <Link
          to="/mis-turnos"
          className="mt-7 inline-flex items-center rounded-[9px] border border-white/25 px-5 py-3 text-sm font-bold text-white transition-colors hover:border-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright focus-visible:ring-offset-2 focus-visible:ring-offset-night"
        >
          Volver a mis turnos
        </Link>
      </article>

      <aside className="overflow-hidden rounded-[14px] border border-line bg-white">
        <header className="border-b border-line-soft px-5 py-[18px]">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Mientras esperás
          </h2>
        </header>

        {/* Los tres son los que arruinan una consulta cuando se descubren tarde:
            el permiso de cámara se pide recién al entrar, y ahí ya hay alguien
            del otro lado esperando. */}
        <ul className="divide-y divide-line-soft">
          <Consejo titulo="Probá la cámara y el micrófono">
            El navegador te los va a pedir al entrar. Si ya se los negaste alguna vez,
            habilitalos desde el candado de la barra de direcciones.
          </Consejo>
          <Consejo titulo="Buscá un lugar tranquilo">
            Vas a hablar de tu salud. Con auriculares se escucha mejor y no te escucha
            nadie más.
          </Consejo>
          <Consejo titulo="Tené a mano lo que quieras mostrar">
            Estudios, recetas o la caja del remedio que estás tomando.
          </Consejo>
        </ul>
      </aside>
    </div>
  );
}

function Fila({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-on-night">{titulo}</dt>
      <dd className="font-semibold text-on-night-strong">{children}</dd>
    </div>
  );
}

function Consejo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <li className="px-5 py-4">
      <p className="text-[13px] font-bold text-brand-deep">{titulo}</p>
      <p className="mt-1 text-[13px] leading-[1.6] text-muted">{children}</p>
    </li>
  );
}
