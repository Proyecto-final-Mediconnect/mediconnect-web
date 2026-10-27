import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog';
import {
  useConversationRealtime,
  useHideConversation,
  useMarkConversationRead,
  useMessages,
  useSendMessage,
} from '../hooks/useChat';
import type { ChatCounterpart } from '../types/chat';
import { ChatFrame, MessageComposer } from './ChatFrame';

const TIME = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

type Props = {
  conversationId: string;
  counterpart: ChatCounterpart;
  myId: string;
};

/**
 * Una conversación abierta (ENG-70).
 *
 * Los mensajes llegan por Realtime cuando hay conexión y por refetch cuando no;
 * el texto del encabezado dice cuál de los dos está andando, así nadie espera en
 * vivo algo que se actualiza cada pocos segundos.
 */
export function ConversationView({ conversationId, counterpart, myId }: Props) {
  const navigate = useNavigate();
  const status = useConversationRealtime(conversationId);
  const live = status === 'en-vivo';
  const messages = useMessages(conversationId, live);
  const send = useSendMessage(conversationId);
  const hide = useHideConversation();
  const { mutate: markAsRead } = useMarkConversationRead(conversationId, myId);
  const [confirmingHide, setConfirmingHide] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const markedUpTo = useRef<string | null>(null);

  const list = messages.messages;
  const lastId = list.at(-1)?.id;
  const newestUnread = list.findLast((m) => m.autorId !== myId && m.leidoEl === null)?.id;

  // Solo se marca leído con la pestaña a la vista: con Realtime el mensaje entra
  // aunque nadie esté mirando, y la otra persona vería "Leído" sin que lo sea.
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible');
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);

  // Lo que llega con la conversación a la vista se da por leído. Una vez por
  // mensaje: si el pedido falla, no se reintenta en loop contra el backend; se
  // vuelve a intentar cuando llega otro mensaje o la pestaña vuelve a verse.
  useEffect(() => {
    if (!visible || !newestUnread || markedUpTo.current === newestUnread) return;
    markedUpTo.current = newestUnread;
    markAsRead();
  }, [visible, newestUnread, markAsRead]);

  // `scrollIntoView` no existe en jsdom: el `?.` evita que los tests lo necesiten.
  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ block: 'end' });
  }, [lastId]);

  function confirmHide() {
    hide.mutate(conversationId, {
      onSuccess: () => navigate('/mensajes', { replace: true }),
    });
  }

  return (
    <>
      <ChatFrame
        counterpart={counterpart}
        busy={messages.isFetching}
        aside={
          <>
            <p role="status" className="flex items-center gap-1.5 text-[12px] text-muted">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${live ? 'bg-brand' : 'bg-line-strong'}`}
              />
              {live ? 'En vivo' : 'Se actualiza cada pocos segundos'}
            </p>
            <button
              type="button"
              onClick={() => setConfirmingHide(true)}
              className="rounded-[8px] px-2 py-1 text-[12px] font-semibold text-danger hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
            >
              Borrar chat
            </button>
          </>
        }
        composer={
          <MessageComposer
            counterpartName={counterpart.nombre}
            pending={send.isPending}
            error={send.error}
            onSend={(content, onSent) => send.mutate(content, { onSuccess: onSent })}
          />
        }
      >
        {messages.isPending ? (
          <p role="status" className="text-[14px] text-muted">
            Cargando mensajes…
          </p>
        ) : messages.isError && list.length === 0 ? (
          <div role="alert" className="grid justify-items-start gap-3">
            <p className="text-[14px] text-danger">{messages.error.message}</p>
            <button
              type="button"
              onClick={() => void messages.refetch()}
              className="rounded-[9px] border border-line-strong bg-white px-4 py-2 text-[13px] font-bold text-brand-deep"
            >
              Probá de nuevo
            </button>
          </div>
        ) : (
          <>
            {messages.hasNextPage && (
              <div className="mb-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => void messages.fetchNextPage()}
                  disabled={messages.isFetchingNextPage}
                  className="rounded-full border border-line-strong bg-white px-4 py-1.5 text-[12px] font-bold text-brand-deep disabled:opacity-50"
                >
                  {messages.isFetchingNextPage ? 'Cargando…' : 'Ver mensajes anteriores'}
                </button>
              </div>
            )}
            {list.length === 0 ? (
              <p className="text-[14px] text-muted">Todavía no hay mensajes. Escribí el primero.</p>
            ) : (
              <ol aria-label={`Mensajes con ${counterpart.nombre}`} className="grid gap-2.5">
                {list.map((m) => {
                  const mine = m.autorId === myId;
                  return (
                    <li key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[78%] rounded-[12px] px-3.5 py-2 ${
                          mine ? 'bg-brand-deep text-white' : 'border border-line bg-white text-ink'
                        }`}
                      >
                        <span className="sr-only">{mine ? 'Vos' : counterpart.nombre}: </span>
                        <p className="whitespace-pre-wrap break-words text-[14px] leading-[1.5]">
                          {m.contenido}
                        </p>
                        <p
                          className={`mt-1 text-right text-[11px] ${mine ? 'text-white/70' : 'text-muted'}`}
                        >
                          {TIME.format(new Date(m.enviadoEl))}
                          {mine && m.leidoEl ? ' · Leído' : ''}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </ChatFrame>

      <ConfirmDialog
        open={confirmingHide}
        titulo="¿Borrar este chat?"
        confirmar="Borrar chat"
        destructivo
        pendiente={hide.isPending}
        onConfirm={confirmHide}
        onCancel={() => setConfirmingHide(false)}
      >
        {list.length === 0 ? (
          <p>El chat con {counterpart.nombre} no tiene mensajes y se elimina.</p>
        ) : (
          <p>
            Se va de tu bandeja. {counterpart.nombre} lo sigue viendo y los mensajes no se borran.
            Si alguno de los dos vuelve a escribir, reaparece con todo el historial.
          </p>
        )}
        {hide.isError && (
          <p role="alert" className="mt-2 text-danger">
            {hide.error.message}
          </p>
        )}
      </ConfirmDialog>
    </>
  );
}
