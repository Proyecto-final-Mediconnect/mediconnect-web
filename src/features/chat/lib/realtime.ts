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

export function isRealtimeConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

/** El token vigente, o uno nuevo si está por vencer. `null` si no hay sesión. */
async function currentToken(): Promise<string | null> {
  if (cached && cached.expiresAt - Date.now() > RENEW_BEFORE_MS) return cached.token;
  pending ??= getRealtimeToken()
    .then(({ accessToken, expiraEl }) => {
      cached = { token: accessToken, expiresAt: new Date(expiraEl).getTime() };
      return accessToken;
    })
    .catch(() => {
      cached = null;
      return null;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
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

  void realtimeClient().then((supabase) => {
    if (stopped) return;
    if (!supabase) {
      onStatus('sin-conexion');
      return;
    }
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

/** Corta el socket y olvida el token. Se llama al cerrar sesión. */
export function disconnectRealtime(): void {
  cached = null;
  void client?.then((supabase) => supabase?.removeAllChannels());
}
