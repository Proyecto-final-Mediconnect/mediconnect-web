import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNow } from '../../../shared/hooks/useNow';
import { useMarkNotificationRead, useMyNotifications } from '../hooks/useNotifications';
import { relativeTime } from '../lib/relativeTime';

/**
 * La campanita de avisos del shell privado (ENG-69).
 *
 * El contador es lo único que se ve sin abrirla, así que es lo que tiene que
 * estar bien: cuenta los no leídos que dice el servidor y no los que hay en la
 * lista, que trae solo los últimos.
 *
 * Tocar un aviso lo marca como leído. El de un mensaje nuevo (ENG-70) además
 * lleva al chat; los de turnos no navegan: el texto ya dice qué pasó y con quién.
 */
export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const now = useNow(60_000);
  const inbox = useMyNotifications();
  const markRead = useMarkNotificationRead();
  const navigate = useNavigate();

  // Una respuesta con otra forma (un 200 que no es la bandeja) no rompe el shell.
  const notifications = Array.isArray(inbox.data?.notifications) ? inbox.data.notifications : [];
  const unread = typeof inbox.data?.unreadCount === 'number' ? inbox.data.unreadCount : 0;

  // Se cierra con Escape o tocando afuera, como cualquier menú desplegable.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  const label = unread > 0 ? `Avisos, ${unread} sin leer` : 'Avisos';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-brand-deep transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <IconBell />
        {unread > 0 && (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-label="Avisos"
          className="absolute right-0 top-full z-40 mt-2 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[14px] border border-line bg-white shadow-[0_18px_40px_rgba(4,29,40,0.18)]"
        >
          <p className="border-b border-line px-5 py-3.5 text-[15px] font-bold text-brand-deep">
            Avisos
          </p>

          {inbox.isPending ? (
            <p role="status" className="px-5 py-6 text-sm text-muted">
              Cargando avisos…
            </p>
          ) : inbox.isError && !inbox.data ? (
            <p role="alert" className="px-5 py-6 text-sm text-danger">
              {inbox.error.message}
            </p>
          ) : notifications.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted">No tenés avisos todavía.</p>
          ) : (
            <ul className="max-h-[420px] divide-y divide-line overflow-y-auto">
              {notifications.map((n) => {
                const unreadItem = n.readAt === null;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (unreadItem) markRead.mutate(n.id);
                        if (n.conversationId) {
                          setOpen(false);
                          navigate(`/mensajes/${n.conversationId}`);
                        }
                      }}
                      aria-label={`${unreadItem ? 'Sin leer: ' : ''}${n.title}. ${n.body}`}
                      className={`grid w-full gap-1 px-5 py-3.5 text-left transition-colors hover:bg-surface focus:outline-none focus-visible:bg-surface ${
                        unreadItem ? 'bg-surface-teal/40' : ''
                      }`}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="text-[14px] font-bold text-brand-deep">{n.title}</span>
                        {unreadItem && (
                          <span
                            aria-hidden="true"
                            className="mt-1.5 h-2 w-2 flex-none rounded-full bg-brand"
                          />
                        )}
                      </span>
                      <span className="text-[13px] leading-[1.5] text-ink">{n.body}</span>
                      <span className="text-[12px] text-muted">
                        {relativeTime(now, n.createdAt)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function IconBell() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
