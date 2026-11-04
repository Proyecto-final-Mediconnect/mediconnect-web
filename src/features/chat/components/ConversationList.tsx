import { useState } from 'react';
import { Link } from 'react-router-dom';
import { messagePreview } from '../lib/attachments';
import { formatInboxTime } from '../lib/format';
import type { ConversationInbox } from '../types/chat';
import { Avatar } from './ChatFrame';

/** Con pocas conversaciones el buscador es ruido: aparece recién pasando esta cantidad. */
export const SEARCH_THRESHOLD = 6;

type Props = {
  inbox: ConversationInbox;
  selectedId?: string;
  myId: string;
  /** Abre el selector de "Nuevo chat". */
  onNewChat: () => void;
};

/** Sin tildes ni mayúsculas, para que "martin" encuentre a "Martín". */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * La bandeja del chat (ENG-70): las conversaciones, la más activa primero, con
 * el botón para empezar una nueva arriba.
 */
export function ConversationList({ inbox, selectedId, myId, onNewChat }: Props) {
  const { conversaciones } = inbox;
  const [search, setSearch] = useState('');
  const searchable = conversaciones.length > SEARCH_THRESHOLD;
  const query = normalize(search.trim());
  const visible =
    searchable && query
      ? conversaciones.filter((c) => normalize(c.contraparte.nombre).includes(query))
      : conversaciones;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
        <h2 className="text-[15px] font-extrabold text-brand-deep">Conversaciones</h2>
        <button
          type="button"
          onClick={onNewChat}
          aria-label="Nuevo chat"
          title="Nuevo chat"
          className="flex size-11 items-center justify-center rounded-[12px] bg-brand text-ink-deep hover:bg-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-deep"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-[18px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
      </div>

      {searchable && (
        <div className="px-5 pb-3">
          <label htmlFor="chat-buscar" className="sr-only">
            Buscar conversación
          </label>
          <input
            id="chat-buscar"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre"
            className="h-10 w-full rounded-[10px] border border-line-strong px-3 text-[14px] text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>
      )}

      {conversaciones.length === 0 ? (
        <p className="px-5 py-2 text-[14px] text-muted">
          Todavía no tenés conversaciones. Empezá una con el botón de arriba.
        </p>
      ) : visible.length === 0 ? (
        <p className="px-5 py-2 text-[14px] text-muted">Nadie coincide con “{search.trim()}”.</p>
      ) : (
        <ul
          aria-label="Conversaciones"
          className="grid min-h-0 grid-cols-[minmax(0,1fr)] content-start gap-0.5 overflow-y-auto overflow-x-hidden px-2 pb-3"
        >
          {visible.map((c) => {
            const last = c.ultimoMensaje;
            const selected = c.id === selectedId;
            const unread = c.noLeidos > 0 && !selected;
            return (
              <li key={c.id}>
                <Link
                  to={`/mensajes/${c.id}`}
                  aria-current={selected ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-[12px] px-3 py-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                    selected ? 'bg-surface-teal' : 'hover:bg-surface'
                  }`}
                >
                  <Avatar name={c.contraparte.nombre} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate text-[14px] font-extrabold text-brand-deep">
                        {c.contraparte.nombre}
                      </span>
                      {last && (
                        <span
                          className={`flex-none text-[12px] ${unread ? 'font-bold text-brand-hover' : 'text-muted'}`}
                        >
                          {formatInboxTime(last.enviadoEl)}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span
                        className={`min-w-0 truncate text-[13px] ${unread ? 'font-semibold text-ink' : 'text-[#475569]'}`}
                      >
                        {last
                          ? `${last.autorId === myId ? 'Vos: ' : ''}${messagePreview(last)}`
                          : 'Sin mensajes todavía'}
                      </span>
                      {c.noLeidos > 0 && (
                        <span className="flex h-5 min-w-5 flex-none items-center justify-center rounded-full bg-brand px-1.5 text-[11px] font-extrabold text-ink-deep">
                          {c.noLeidos > 9 ? '9+' : c.noLeidos}
                          <span className="sr-only"> sin leer</span>
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
