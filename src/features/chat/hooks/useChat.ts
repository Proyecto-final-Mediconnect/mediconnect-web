import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { isClientError } from '../../../shared/api/apiError';
import {
  getMessages,
  getMyConversations,
  hideConversation,
  markConversationRead,
  openConversation,
  sendAttachment,
  sendMessage,
} from '../api/chatApi';
import { mergeMessages } from '../lib/messages';
import {
  subscribeToConversation,
  subscribeToChatSignals,
  type ChatSignals,
  type RealtimeStatus,
} from '../lib/realtime';
import type { ChatMessage, MessagesPage } from '../types/chat';

export const CHAT_INBOX_KEY = ['chat', 'inbox'] as const;
const messagesKey = (conversationId: string) => ['chat', 'messages', conversationId] as const;

/** La campanita (ENG-69): abrir un chat apaga su aviso de mensaje nuevo. */
const NOTIFICATIONS_KEY = ['notifications', 'me'] as const;

/** Sin Realtime, cada cuánto se buscan mensajes nuevos de la conversación abierta. */
export const POLL_INTERVAL_MS = 5_000;
/** Con Realtime, igual se reconcilia de vez en cuando: el stream puede perder un evento. */
const LIVE_RECONCILE_MS = 60_000;

const retryUnlessClientError = (failureCount: number, error: Error) =>
  !isClientError(error) && failureCount < 1;

/** Mis conversaciones. Se refresca cada 30 s para que el contador de no leídos no quede viejo. */
export function useConversations() {
  return useQuery({
    queryKey: CHAT_INBOX_KEY,
    queryFn: getMyConversations,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: retryUnlessClientError,
  });
}

/**
 * Los mensajes de una conversación, de a páginas: la primera es la más
 * reciente y `fetchNextPage` trae las anteriores.
 *
 * Con Realtime en vivo, el pedido periódico es solo una reconciliación de fondo;
 * sin él, es lo que trae los mensajes nuevos. Ese pedido trae únicamente la
 * página más reciente: un `refetch` del `useInfiniteQuery` volvería a pedir, una
 * por una, todas las páginas que el usuario fue abriendo.
 */
export function useMessages(conversationId: string | undefined, live: boolean) {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: messagesKey(conversationId ?? ''),
    queryFn: ({ pageParam }) => getMessages(conversationId!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.hayMas ? last.mensajes[0]?.id : undefined),
    enabled: Boolean(conversationId),
    retry: retryUnlessClientError,
  });

  useEffect(() => {
    if (!conversationId) return;
    const reconcile = () => {
      if (document.visibilityState === 'visible') reconcileLatest(queryClient, conversationId);
    };
    const timer = setInterval(reconcile, live ? LIVE_RECONCILE_MS : POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', reconcile);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', reconcile);
    };
  }, [conversationId, live, queryClient]);

  const messages = useMemo(
    () => mergeMessages([], query.data?.pages.flatMap((page) => page.mensajes) ?? []),
    [query.data],
  );

  return { ...query, messages };
}

/**
 * Vuelve a pedir la página más reciente y la funde con la caché. Trae los
 * mensajes nuevos y también los "Leído" que cambiaron.
 */
/**
 * Con uno en vuelo no se pide otro: se anota y se repite una sola vez al
 * terminar. Así un "leí" que llega junto con la reconciliación de fondo no
 * duplica pedidos, y un cliente que mande "leí" en loop no hace refetchear al
 * otro sin parar.
 */
const inFlight = new Map<string, { again: boolean }>();

function reconcileLatest(queryClient: QueryClient, conversationId: string) {
  const running = inFlight.get(conversationId);
  if (running) {
    running.again = true;
    return;
  }
  const state = { again: false };
  inFlight.set(conversationId, state);
  getMessages(conversationId)
    .then((page) => {
      for (const message of page.mensajes) addToCache(queryClient, conversationId, message);
    })
    // Un fallo de red no pisa lo que ya se ve: se reintenta en el próximo ciclo.
    .catch(() => {})
    .finally(() => {
      inFlight.delete(conversationId);
      if (state.again) reconcileLatest(queryClient, conversationId);
    });
}

/** Suma un mensaje a la página más reciente de la caché, sin duplicarlo. */
function addToCache(queryClient: QueryClient, conversationId: string, message: ChatMessage) {
  queryClient.setQueryData<InfiniteData<MessagesPage, string | undefined>>(
    messagesKey(conversationId),
    (data) => {
      if (!data || data.pages.length === 0) return data;
      const [latest, ...older] = data.pages;
      return {
        ...data,
        pages: [{ ...latest, mensajes: mergeMessages(latest.mensajes, [message]) }, ...older],
      };
    },
  );
}

/**
 * Escucha la conversación abierta por Realtime y devuelve el estado de la
 * conexión.
 *
 * Al quedar suscripto vuelve a pedir el historial: lo que llegó entre la carga
 * inicial y la suscripción no viene por el socket (recomendación 1 del spike).
 */
export function useConversationRealtime(conversationId: string | undefined): RealtimeStatus {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RealtimeStatus>('conectando');

  useEffect(() => {
    if (!conversationId) return;
    return subscribeToConversation(
      conversationId,
      (message) => {
        addToCache(queryClient, conversationId, message);
        void queryClient.invalidateQueries({ queryKey: CHAT_INBOX_KEY });
      },
      (next) => {
        setStatus(next);
        if (next === 'en-vivo') {
          void queryClient.invalidateQueries({ queryKey: messagesKey(conversationId) });
        }
      },
    );
  }, [conversationId, queryClient]);

  return status;
}

/** Cuánto sigue la burbuja de "escribiendo" sin un aviso nuevo. Un poco más que el espaciado de los avisos. */
export const TYPING_VISIBLE_MS = 4_000;

/**
 * Los avisos en vivo entre los dos navegadores del chat.
 *
 * - "Escribiendo": la burbuja se apaga sola si dejan de llegar avisos, o con
 *   `clearTyping` cuando entra su mensaje.
 * - "Leí": cuando la otra persona lee, se vuelven a pedir los mensajes y mis
 *   "Leído" aparecen al momento, sin esperar la reconciliación de fondo.
 */
export function useChatSignals(conversationId: string) {
  const queryClient = useQueryClient();
  const [othersTyping, setOthersTyping] = useState(false);
  const signals = useRef<ChatSignals | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    signals.current = subscribeToChatSignals(conversationId, {
      onTyping: () => {
        setOthersTyping(true);
        clearTimeout(timer);
        timer = setTimeout(() => setOthersTyping(false), TYPING_VISIBLE_MS);
      },
      onRead: () => reconcileLatest(queryClient, conversationId),
    });
    return () => {
      clearTimeout(timer);
      signals.current?.stop();
      signals.current = null;
    };
  }, [conversationId, queryClient]);

  const notifyTyping = useCallback(() => signals.current?.notifyTyping(), []);
  const notifyRead = useCallback(() => signals.current?.notifyRead(), []);
  const clearTyping = useCallback(() => setOthersTyping(false), []);

  return { othersTyping, notifyTyping, notifyRead, clearTyping };
}

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (contenido: string) => sendMessage(conversationId, contenido),
    onSuccess: (message) => {
      addToCache(queryClient, conversationId, message);
      void queryClient.invalidateQueries({ queryKey: CHAT_INBOX_KEY });
    },
  });
}

/** Manda un archivo con un texto opcional (ENG-102). */
export function useSendAttachment(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, contenido }: { file: File; contenido?: string }) =>
      sendAttachment(conversationId, file, contenido),
    onSuccess: (message) => {
      addToCache(queryClient, conversationId, message);
      void queryClient.invalidateQueries({ queryKey: CHAT_INBOX_KEY });
    },
  });
}

/**
 * Marca leído lo que mandó la otra persona. Al terminar actualiza la caché de
 * mensajes en el lugar: si esperara al próximo refetch, la pantalla seguiría
 * viendo mensajes sin leer y volvería a pedir la marca.
 */
export function useMarkConversationRead(conversationId: string, myId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => markConversationRead(conversationId),
    onSuccess: () => {
      const now = new Date().toISOString();
      queryClient.setQueryData<InfiniteData<MessagesPage, string | undefined>>(
        messagesKey(conversationId),
        (data) =>
          data && {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              mensajes: page.mensajes.map((m) =>
                m.autorId !== myId && m.leidoEl === null ? { ...m, leidoEl: now } : m,
              ),
            })),
          },
      );
      void queryClient.invalidateQueries({ queryKey: CHAT_INBOX_KEY });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}

/**
 * Arranca una conversación con el primer mensaje: recién ahí se crea en el
 * backend (`POST /conversations`), así elegir con quién hablar y arrepentirse no
 * deja un chat vacío en ninguna de las dos bandejas.
 */
export function useStartConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      contraparteId,
      contenido,
    }: {
      contraparteId: string;
      contenido: string;
    }) => {
      const conversation = await openConversation(contraparteId);
      await sendMessage(conversation.id, contenido);
      return conversation;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAT_INBOX_KEY }),
  });
}

/** "Borrar chat": lo saca de mi bandeja y olvida sus mensajes en la caché. */
export function useHideConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: hideConversation,
    onSuccess: (_data, conversationId) => {
      queryClient.removeQueries({ queryKey: messagesKey(conversationId) });
      return queryClient.invalidateQueries({ queryKey: CHAT_INBOX_KEY });
    },
  });
}
