import type { ChatMessage } from '../types/chat';

/**
 * Une dos listas de mensajes sin repetir ninguno, en orden cronológico.
 *
 * Es la reconciliación que pidió el spike ENG-52: el historial llega por HTTP y
 * los nuevos por Realtime, y los dos caminos se pisan (el mensaje propio vuelve
 * por el socket, un refetch trae lo que ya había llegado). El `id` decide qué es
 * el mismo mensaje; si aparece dos veces, gana la versión más nueva (`incoming`),
 * que puede traer `leidoEl`.
 */
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort(compareMessages);
}

/** Por fecha de envío, con el `id` como desempate: el mismo orden que el backend. */
function compareMessages(a: ChatMessage, b: ChatMessage): number {
  if (a.enviadoEl !== b.enviadoEl) return a.enviadoEl < b.enviadoEl ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Fila de `messages` tal como la entrega Realtime (Postgres Changes). */
export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
  read_at: string | null;
}

/**
 * Pasa una fila de Realtime a la forma de la API. Postgres manda las fechas como
 * `2026-10-26 18:17:07.568+00`; se normalizan a ISO para que comparen bien con
 * las que vienen por HTTP.
 */
export function fromRow(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversacionId: row.conversation_id,
    autorId: row.sender_id,
    contenido: row.content ?? '',
    enviadoEl: toIso(row.created_at),
    leidoEl: row.read_at ? toIso(row.read_at) : null,
  };
}

/**
 * `Date` no parsea igual en todos los navegadores el formato de Postgres (Safari
 * rechaza el espacio y el offset `+00` sin minutos), así que se lleva primero a
 * ISO-8601 estricto.
 */
function toIso(value: string): string {
  const strict = value.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
  return new Date(strict).toISOString();
}
