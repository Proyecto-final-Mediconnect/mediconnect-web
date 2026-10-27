import { Link } from 'react-router-dom';
import type { ConversationInbox } from '../types/chat';

const WHEN = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

type Props = {
  inbox: ConversationInbox;
  selectedId?: string;
  myId: string;
  /** Abre el selector de "Nuevo chat". */
  onNewChat: () => void;
};

/**
 * La bandeja del chat (ENG-70): las conversaciones, la más activa primero, con
 * el botón para empezar una nueva arriba.
 */
export function ConversationList({ inbox, selectedId, myId, onNewChat }: Props) {
  const { conversaciones } = inbox;

  return (
    <div className="grid content-start gap-3">
      <button
        type="button"
        onClick={onNewChat}
        className="rounded-[10px] bg-brand px-4 py-2.5 text-[14px] font-bold text-ink-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-deep"
      >
        + Nuevo chat
      </button>
      {conversaciones.length === 0 ? (
        <p className="rounded-[14px] border border-line bg-white px-5 py-4 text-[14px] text-muted">
          Todavía no tenés conversaciones.
        </p>
      ) : (
        <ul
          aria-label="Conversaciones"
          className="divide-y divide-line overflow-hidden rounded-[14px] border border-line bg-white"
        >
          {conversaciones.map((c) => {
            const last = c.ultimoMensaje;
            const selected = c.id === selectedId;
            return (
              <li key={c.id}>
                <Link
                  to={`/mensajes/${c.id}`}
                  aria-current={selected ? 'page' : undefined}
                  className={`grid gap-1 px-5 py-3.5 transition-colors hover:bg-surface focus:outline-none focus-visible:bg-surface ${
                    selected ? 'bg-surface-teal/50' : ''
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="truncate text-[14px] font-bold text-brand-deep">
                      {c.contraparte.nombre}
                    </span>
                    {c.noLeidos > 0 && (
                      <span className="flex-none rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-ink-deep">
                        {c.noLeidos > 9 ? '9+' : c.noLeidos}
                        <span className="sr-only"> sin leer</span>
                      </span>
                    )}
                  </span>
                  <span className="truncate text-[13px] text-ink">
                    {last
                      ? `${last.autorId === myId ? 'Vos: ' : ''}${last.contenido}`
                      : 'Sin mensajes todavía'}
                  </span>
                  {last && (
                    <span className="text-[12px] text-muted">
                      {WHEN.format(new Date(last.enviadoEl))}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
