import { useEffect, useMemo, useState } from 'react';
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
  sendMessage,
} from '../api/chatApi';
import { mergeMessages } from '../lib/messages';
import { subscribeToConversation, type RealtimeStatus } from '../lib/realtime';
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
 * Con Realtime en vivo, el refetch es solo una reconciliación de fondo; sin él,
 * es lo que trae los mensajes nuevos.
 */
export function useMessages(conversationId: string | undefined, live: boolean) {
  const query = useInfiniteQuery({
    queryKey: messagesKey(conversationId ?? ''),
    queryFn: ({ pageParam }) => getMessages(conversationId!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.hayMas ? last.mensajes[0]?.id : undefined),
    enabled: Boolean(conversationId),
    refetchInterval: live ? LIVE_RECONCILE_MS : POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
    retry: retryUnlessClientError,
  });

  const messages = useMemo(
    () => mergeMessages([], query.data?.pages.flatMap((page) => page.mensajes) ?? []),
    [query.data],
  );

  return { ...query, messages };
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
