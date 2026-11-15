import type { SupabaseClient } from '@supabase/supabase-js';
import { getRealtimeToken } from '../api/chatApi';
import { fromRow, type MessageRow } from './messages';
import type { ChatMessage } from '../types/chat';

/**
 * Conexión del chat a Supabase Realtime (ADR-011, spike ENG-52).
 *
 * ## El token
 *
 * La sesión de la web vive en cookies httpOnly y este código no puede leerla.
 * Realtime necesita el JWT para evaluar RLS como el usuario: sin él se conecta
 * como `anon` y no recibe nada. Lo pide a `GET /conversations/realtime-token` y
 * lo guarda **solo en memoria**, nunca en `localStorage`.
 *
 * Se lo da al cliente por la opción `accessToken`, que Realtime vuelve a llamar
 * en cada heartbeat: así un token por vencer se renueva solo (recomendación 4
 * del spike), sin un timer propio.
 *
 * ## Carga diferida
 *
 * `supabase-js` se importa recién al abrir un chat: el resto de la web no lo
 * usa, y sumarlo al bundle principal lo haría más pesado para todas las
 * pantallas.
 *
 * ## Si no hay Realtime
 *
 * Sin `VITE_SUPABASE_*` no hay a dónde conectarse: `isRealtimeConfigured()` da
 * `false` y el chat queda con el refetch periódico. **En local conviene dejarlas
 * vacías**: el backend local escribe en el Postgres de Docker, así que un socket
 * contra el proyecto de Supabase conecta ("En vivo") pero nunca recibe nada, y
 * los mensajes llegan recién con la reconciliación de fondo.
 */

/** Se pide un token nuevo cuando al vigente le queda menos que esto. */
const RENEW_BEFORE_MS = 2 * 60_000;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: Promise<SupabaseClient | null> | null = null;
let cached: { token: string; expiresAt: number } | null = null;
let pending: Promise<string | null> | null = null;
/** Sube al cerrar sesión: invalida los pedidos de token que quedaron en vuelo. */
let generation = 0;

export function isRealtimeConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/** El token vigente, o uno nuevo si está por vencer. `null` si no hay sesión. */
async function currentToken(): Promise<string | null> {
  if (cached && cached.expiresAt - Date.now() > RENEW_BEFORE_MS) return cached.token;
  const gen = generation;
  pending ??= getRealtimeToken()
    .then(({ accessToken, expiraEl }) => {
      // Si se cerró sesión mientras el pedido estaba en vuelo, el token es del
      // usuario que se fue: no se guarda.
      if (gen === generation) {
        cached = { token: accessToken, expiresAt: new Date(expiraEl).getTime() };
      }
      return accessToken;
    })
    .catch(() => {
      if (gen === generation) cached = null;
      return null;
    })
    .finally(() => {
      if (gen === generation) pending = null;
    });
  return pending;
}

/**
 * Deja el token puesto en el socket **antes** de unirse a un canal. Con la opción
 * `accessToken`, supabase-js lo pide por su cuenta pero sin esperarlo: el canal
 * puede unirse como `anon`, quedar "SUBSCRIBED" y, por la RLS, no recibir nunca
 * nada. Es el síntoma de "el mensaje aparece recién al recargar".
 */
async function authorized(supabase: SupabaseClient): Promise<void> {
  try {
    await supabase.realtime.setAuth();
  } catch {
    // Sin token el canal igual se une; la reconciliación de fondo cubre el resto.
  }
}

function realtimeClient(): Promise<SupabaseClient | null> {
  client ??= import('@supabase/supabase-js')
    .then(({ createClient }) =>
      createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
        // Con `accessToken`, supabase-js no maneja una sesión propia: la sesión
        // es la del backend y este cliente solo sirve para el socket.
        accessToken: async () => (await currentToken()) ?? '',
      }),
    )
    .catch((err: unknown) => {
      // Una variable mal cargada (una URL que no es URL) no puede tirar abajo la
      // pantalla: el chat sigue andando con el refetch periódico.
      client = null; // permite reintentar en la próxima suscripción
      console.warn('No se pudo iniciar Realtime; el chat sigue con refetch periódico.', err);
      return null;
    });
  return client;
}

export type RealtimeStatus = 'conectando' | 'en-vivo' | 'sin-conexion';

/**
 * Escucha los mensajes nuevos de una conversación. Devuelve la función para
 * dejar de escuchar.
 *
 * El `filter` por conversación es una comodidad para no recibir eventos de
 * otros chats propios, **no** el control de acceso: quien decide qué llega es la
 * política RLS de `messages` (ver el informe del spike).
 */
export function subscribeToConversation(
  conversationId: string,
  onMessage: (message: ChatMessage) => void,
  onStatus: (status: RealtimeStatus) => void,
): () => void {
  if (!isRealtimeConfigured()) {
    onStatus('sin-conexion');
    return () => {};
  }

  onStatus('conectando');
  let stopped = false;
  let stop = () => {};

  void realtimeClient().then(async (supabase) => {
    if (stopped) return;
    if (!supabase) {
      onStatus('sin-conexion');
      return;
    }
    await authorized(supabase);
    if (stopped) return;
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on<MessageRow>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => onMessage(fromRow(payload.new)),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') onStatus('en-vivo');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          onStatus('sin-conexion');
        }
      });
    stop = () => void supabase.removeChannel(channel);
  });

  return () => {
    stopped = true;
    stop();
  };
}

/**
 * Escucha **cualquier** mensaje nuevo mío, de cualquier conversación, para que
 * la bandeja y el contador de no leídos se actualicen sin esperar el refetch ni
 * recargar. Sin `filter`: quien decide qué llega es la RLS de `messages`, que
 * solo deja pasar las conversaciones de las que soy parte.
 */
export function subscribeToInbox(onChange: () => void): () => void {
  if (!isRealtimeConfigured()) return () => {};
  let stopped = false;
  let stop = () => {};

  void realtimeClient().then(async (supabase) => {
    if (stopped || !supabase) return;
    await authorized(supabase);
    if (stopped) return;
    const channel = supabase
      .channel('inbox')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, onChange)
      .subscribe();
    stop = () => void supabase.removeChannel(channel);
  });

  return () => {
    stopped = true;
    stop();
  };
}

/** Como mucho un aviso de "escribiendo" cada tanto, no uno por tecla. */
export const TYPING_SEND_EVERY_MS = 2_500;

export interface ChatSignals {
  /** Avisa que estoy escribiendo. Se puede llamar en cada tecla: se espacia solo. */
  notifyTyping: () => void;
  /**
   * Avisa que acabo de mandar un mensaje, para que el otro lo pida al backend al
   * momento. Es el camino que **no** depende de Postgres Changes ni de la RLS: si
   * ese stream se cae o llega tarde, el mensaje igual aparece.
   */
  notifyMessage: () => void;
  /** Avisa que acabo de leer la conversación, para que el "Leído" del otro no espere al refetch. */
  notifyRead: () => void;
  stop: () => void;
}

/**
 * Avisos entre los dos navegadores de una conversación, por Broadcast de
 * Realtime: "está escribiendo…", "leí" y "mandé un mensaje".
 *
 * El canal es **privado** (`typing:<id>`): Realtime deja escuchar y avisar solo a
 * quien las políticas de `realtime.messages` se lo permiten, y esas piden ser
 * participante de la conversación (migración `eng70_chat_typing` del backend).
 * Un canal público lo podría escuchar cualquiera que sepa el id.
 *
 * Los avisos no llevan datos: "leí" y "mensaje" solo hacen que el otro vuelva a
 * pedir los mensajes al backend, que es de donde sale el "Leído". Un aviso falso no puede
 * marcar nada.
 *
 * Sin Realtime no hay avisos: el refetch cada pocos segundos trae el "Leído" y
 * el "escribiendo" llegaría tarde para servir.
 */
export function subscribeToChatSignals(
  conversationId: string,
  handlers: { onTyping: () => void; onRead: () => void; onMessage: () => void },
): ChatSignals {
  const none = {
    notifyTyping: () => {},
    notifyRead: () => {},
    notifyMessage: () => {},
    stop: () => {},
  };
  if (!isRealtimeConfigured()) return none;

  let stopped = false;
  let lastTyping = 0;
  /** Recién con el canal unido se manda: antes, `send` cae al REST y con un canal
   *  privado puede perderse sin aviso. */
  let ready = false;
  /** Un "leí" pedido antes de estar unido: es justo el de abrir el chat. */
  let pendingRead = false;
  /** Igual para un mensaje mandado antes de que el canal esté unido. */
  let pendingMessage = false;
  let send: ((event: string) => void) | null = null;
  let stop = () => {};

  void realtimeClient().then(async (supabase) => {
    if (stopped || !supabase) return;
    await authorized(supabase);
    if (stopped) return;
    const channel = supabase
      .channel(`typing:${conversationId}`, { config: { private: true } })
      .on('broadcast', { event: 'escribiendo' }, () => handlers.onTyping())
      .on('broadcast', { event: 'leido' }, () => handlers.onRead())
      .on('broadcast', { event: 'mensaje' }, () => handlers.onMessage());
    send = (event) => void channel.send({ type: 'broadcast', event, payload: {} });
    stop = () => void supabase.removeChannel(channel);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        ready = true;
        if (pendingRead) {
          pendingRead = false;
          send?.('leido');
        }
        if (pendingMessage) {
          pendingMessage = false;
          send?.('mensaje');
        }
        return;
      }
      ready = false;
      // Sin datos del chat: solo que el canal no se unió (¿las políticas del
      // backend lo rechazaron?). El chat sigue andando, sin los avisos.
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn(`Realtime: el canal de avisos del chat quedó en ${status}.`);
      }
    });
  });

  return {
    notifyTyping: () => {
      const now = Date.now();
      if (!send || !ready || now - lastTyping < TYPING_SEND_EVERY_MS) return;
      lastTyping = now;
      send('escribiendo');
    },
    notifyRead: () => {
      if (send && ready) send('leido');
      else pendingRead = true;
    },
    notifyMessage: () => {
      if (send && ready) send('mensaje');
      else pendingMessage = true;
    },
    stop: () => {
      stopped = true;
      send = null;
      stop();
    },
  };
}

/**
 * Corta el socket y olvida el token. Se llama al cerrar sesión, o cuando la
 * sesión muere por cualquier otro motivo.
 *
 * Se suelta el cliente entero y no solo los canales: si no, el WebSocket seguiría
 * abierto pidiendo token en cada heartbeat, y un pedido en vuelo podría guardar
 * el token del usuario anterior para el próximo que entre sin recargar.
 */
export function disconnectRealtime(): void {
  generation++;
  cached = null;
  pending = null;
  const old = client;
  client = null;
  void old?.then(async (supabase) => {
    await supabase?.removeAllChannels();
    supabase?.realtime.disconnect();
  });
}
