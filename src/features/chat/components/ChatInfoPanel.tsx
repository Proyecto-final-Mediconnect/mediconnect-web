import { Link } from 'react-router-dom';
import { formatLongDate, statusLabel } from '../../appointments/lib/myAppointments';
import { formatDate } from '../../appointments/lib/weeks';
import type { Appointment } from '../../appointments/types/appointment';
import { SideDrawer } from '../../../shared/ui/SideDrawer';
import type { ChatCounterpart } from '../types/chat';
import { Avatar } from './ChatFrame';

const ROLE: Record<ChatCounterpart['rol'], string> = {
  PACIENTE: 'Paciente',
  PROFESIONAL: 'Profesional',
};

const WEEKDAY = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  weekday: 'long',
});

type Props = {
  open: boolean;
  counterpart: ChatCounterpart;
  next: Appointment | null;
  past: Appointment[];
  onClose: () => void;
  /** Pide confirmar "Borrar chat". */
  onHide: () => void;
};

/**
 * "Información del chat" (ENG-70): se abre tocando el nombre en el encabezado.
 *
 * Junta lo que sirve tener a mano al chatear —quién es, el próximo turno y los
 * anteriores— y "Borrar chat", que vive acá para no quedar a un toque por error
 * en el encabezado.
 */
export function ChatInfoPanel({ open, counterpart, next, past, onClose, onHide }: Props) {
  return (
    <SideDrawer open={open} title="Información del chat" onClose={onClose}>
      <div className="grid gap-5">
        <div className="grid justify-items-center gap-1.5 pt-2 text-center">
          <Avatar name={counterpart.nombre} size="lg" />
          <p className="mt-1.5 text-[18px] font-extrabold text-brand-deep">{counterpart.nombre}</p>
          <p className="text-[13px] text-muted">{ROLE[counterpart.rol]}</p>
          {counterpart.rol === 'PROFESIONAL' && (
            <Link
              to={`/profesionales/${counterpart.id}`}
              className="mt-1 text-[13px] font-bold text-brand-deep underline-offset-2 hover:underline"
            >
              Ver perfil
            </Link>
          )}
        </div>

        {next && (
          <section
            aria-labelledby="chat-proximo"
            className="grid gap-2 rounded-[12px] bg-surface-teal p-4"
          >
            <h3
              id="chat-proximo"
              className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-hover"
            >
              Próximo turno
            </h3>
            <p className="text-[16px] font-extrabold text-brand-deep first-letter:uppercase">
              {WEEKDAY.format(new Date(next.scheduledAt))} {formatDate(next.date)}
            </p>
            <p className="text-[13px] text-ink">
              {next.startTime} · Videoconsulta · {statusLabel(next.status)}
            </p>
            <Link
              to={`/turnos/${next.id}`}
              className="mt-1 flex h-10 items-center justify-center rounded-[10px] border border-line-strong bg-white text-[13px] font-bold text-brand-deep hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Ver el turno
            </Link>
          </section>
        )}

        {past.length > 0 && (
          <section aria-labelledby="chat-anteriores" className="grid gap-1">
            <h3
              id="chat-anteriores"
              className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted"
            >
              Turnos anteriores
            </h3>
            <ul className="divide-y divide-line-soft rounded-[12px] border border-line bg-white">
              {past.map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/turnos/${a.id}`}
                    className="flex min-h-11 items-center justify-between gap-3 px-4 py-2.5 text-[14px] text-brand-deep hover:bg-surface focus:outline-none focus-visible:bg-surface"
                  >
                    <span>{formatLongDate(a.date)}</span>
                    <span className="text-[12px] text-muted">{statusLabel(a.status)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <button
          type="button"
          onClick={onHide}
          className="flex h-11 items-center justify-center gap-2 rounded-[10px] border border-danger/30 bg-white text-[14px] font-bold text-[#b8304d] hover:bg-danger/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M6 6l1 14h10l1-14" />
          </svg>
          Borrar chat
        </button>
      </div>
    </SideDrawer>
  );
}
