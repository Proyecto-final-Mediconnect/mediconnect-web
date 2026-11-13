import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog';
import {
  useConversationRealtime,
  useHideConversation,
  useMarkConversationRead,
  useMessages,
  useSendAttachment,
  useSendMessage,
  useChatSignals,
} from '../hooks/useChat';
import { useCounterpartAppointments } from '../hooks/useCounterpartAppointments';
import { formatHour, layoutMessages, todayKey } from '../lib/format';
import type { ChatCounterpart } from '../types/chat';
import { ChatFrame, MessageComposer } from './ChatFrame';
import { ChatInfoPanel } from './ChatInfoPanel';
import { MessageAttachment } from './MessageAttachment';

type Props = {
  conversationId: string;
  counterpart: ChatCounterpart;
  myId: string;
};

function ReadIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 28 16"
      className="h-3 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m2 9 4 4 8-10" />
      <path d="m12 13 1 0 8-10" />
    </svg>
  );
}

/**
 * Una conversación abierta (ENG-70).
 *
 * Los mensajes llegan por Realtime cuando hay conexión y por refetch cuando no.
 * Los seguidos de la misma persona se agrupan y muestran la hora una vez, con
 * un separador por día.
 */
export function ConversationView({ conversationId, counterpart, myId }: Props) {
  const navigate = useNavigate();
  const status = useConversationRealtime(conversationId);
  const messages = useMessages(conversationId, status === 'en-vivo');
  const send = useSendMessage(conversationId);
  const sendFile = useSendAttachment(conversationId);
  const hide = useHideConversation();
  const { mutate: markAsRead } = useMarkConversationRead(conversationId, myId);
  const { next, past } = useCounterpartAppointments(counterpart.id, myId);
  const { othersTyping, notifyTyping, notifyRead, clearTyping } = useChatSignals(conversationId);
  const [infoOpen, setInfoOpen] = useState(false);
  const [confirmingHide, setConfirmingHide] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  /** Si el usuario está al fondo del chat. Leyendo historial, no se lo mueve. */
  const atBottom = useRef(true);
  const markedUpTo = useRef<string | null>(null);

  const list = messages.messages;
  const last = list.at(-1);
  const lastId = last?.id;
  // Con el día en las deps, "Hoy" y "Ayer" se corren solos al pasar la medianoche.
  const today = todayKey();
  const rows = useMemo(() => layoutMessages(list, myId), [list, myId, today]); // eslint-disable-line react-hooks/exhaustive-deps
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
    // Al otro le llega "leí" y ve el "Leído" al momento.
    markAsRead(undefined, { onSuccess: notifyRead });
  }, [visible, newestUnread, markAsRead, notifyRead]);

  // Llegó lo que estaba escribiendo: la burbuja ya no tiene sentido.
  const lastFromOther = list.findLast((m) => m.autorId !== myId)?.id;
  useEffect(() => {
    if (lastFromOther) clearTyping();
  }, [lastFromOther, clearTyping]);

  // Se mide al scrollear, no después de pintar: un mensaje nuevo agranda la caja
  // y haría parecer que el usuario ya no estaba al fondo.
  useEffect(() => {
    const box = bodyRef.current;
    if (!box) return;
    const onScroll = () => {
      atBottom.current = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    };
    box.addEventListener('scroll', onScroll, { passive: true });
    return () => box.removeEventListener('scroll', onScroll);
  }, []);

  // Se baja al último solo si el usuario ya estaba al fondo, o si el mensaje es
  // suyo. Leyendo mensajes viejos, ni lo que llega ni la burbuja de "escribiendo"
  // lo mueven. Se mueve la caja de mensajes y nada más: `scrollIntoView` también
  // scrollea la página, que al abrir un chat bajaba más allá del pie de la tarjeta.
  const lastIsMine = last?.autorId === myId;
  useEffect(() => {
    if (atBottom.current || lastIsMine) scrollToEnd(bodyRef.current);
  }, [lastId, lastIsMine]);
  useEffect(() => {
    if (atBottom.current) scrollToEnd(bodyRef.current);
  }, [othersTyping]);

  function confirmHide() {
    hide.mutate(conversationId, {
      onSuccess: () => navigate('/mensajes', { replace: true }),
    });
  }

  return (
    <>
      <ChatFrame
        counterpart={counterpart}
        onOpenInfo={() => setInfoOpen(true)}
        nextAppointment={next}
        busy={messages.isFetching}
        bodyRef={bodyRef}
        composer={
          <MessageComposer
            key={conversationId}
            counterpartName={counterpart.nombre}
            pending={send.isPending || sendFile.isPending}
            error={send.error ?? sendFile.error}
            onSend={(content, onSent) => {
              sendFile.reset();
              send.mutate(content, { onSuccess: onSent });
            }}
            onAttach={(file, content, onSent) => {
              send.reset();
              sendFile.mutate({ file, contenido: content || undefined }, { onSuccess: onSent });
            }}
            onTyping={notifyTyping}
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
              <ol aria-label={`Mensajes con ${counterpart.nombre}`} className="flex flex-col">
                {rows.map(({ message: m, mine, dayLabel, groupStart, groupEnd }) => (
                  <li
                    key={m.id}
                    className={`flex flex-col ${mine ? 'items-end' : 'items-start'} ${
                      groupStart ? 'mt-3 first:mt-0' : 'mt-1'
                    }`}
                  >
                    {dayLabel && (
                      <span className="mb-2 self-center rounded-full border border-line bg-white px-3 py-1 text-[12px] font-bold text-[#475569] first-letter:uppercase">
                        {dayLabel}
                      </span>
                    )}
                    <div
                      className={`max-w-[85%] rounded-[16px] px-3.5 py-2.5 sm:max-w-[70%] ${
                        mine ? 'bg-brand-deep text-white' : 'border border-line bg-white text-ink'
                      }`}
                    >
                      <span className="sr-only">{mine ? 'Vos' : counterpart.nombre}: </span>
                      {m.adjunto && (
                        <MessageAttachment
                          conversationId={conversationId}
                          messageId={m.id}
                          attachment={m.adjunto}
                          mine={mine}
                        />
                      )}
                      {m.contenido && (
                        <p
                          className={`whitespace-pre-wrap break-words text-[14px] leading-[1.5] ${m.adjunto ? 'mt-2' : ''}`}
                        >
                          {m.contenido}
                        </p>
                      )}
                    </div>
                    {groupEnd && (
                      <p className="mx-1 mt-1 flex items-center gap-1 text-[11px] text-muted">
                        {formatHour(m.enviadoEl)}
                        {mine && m.leidoEl && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-brand-hover">
                              <ReadIcon />
                            </span>
                            <span>Leído</span>
                          </>
                        )}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
        {othersTyping && (
          <div className="mt-3 flex items-center">
            <span
              aria-hidden="true"
              className="flex items-center gap-1 rounded-[16px] border border-line bg-white px-3.5 py-3"
            >
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  style={{ animationDelay: `${delay}ms` }}
                  className="size-1.5 rounded-full bg-muted motion-safe:animate-bounce"
                />
              ))}
            </span>
          </div>
        )}
        <p role="status" className="sr-only">
          {othersTyping ? `${counterpart.nombre} está escribiendo` : ''}
        </p>
      </ChatFrame>

      <ChatInfoPanel
        open={infoOpen}
        counterpart={counterpart}
        next={next}
        past={past}
        onClose={() => setInfoOpen(false)}
        onHide={() => {
          setInfoOpen(false);
          setConfirmingHide(true);
        }}
      />

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

/** Lleva la caja de mensajes al final sin mover nada más de la página. */
function scrollToEnd(box: HTMLElement | null): void {
  if (box) box.scrollTop = box.scrollHeight;
}
