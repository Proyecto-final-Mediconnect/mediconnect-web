import type { ChatMessage } from '../types/chat';

const TIME_ZONE = 'America/Argentina/Buenos_Aires';

const DAY_KEY = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const HOUR = new Intl.DateTimeFormat('es-AR', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const SHORT_DATE = new Intl.DateTimeFormat('es-AR', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
});
const LONG_DATE = new Intl.DateTimeFormat('es-AR', {
  timeZone: TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const LONG_DATE_WITH_YEAR = new Intl.DateTimeFormat('es-AR', {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Dos mensajes seguidos de la misma persona se agrupan si los separa menos que esto. */
const GROUP_GAP_MS = 5 * 60_000;

/** `YYYY-MM-DD` del día en Argentina, para comparar días sin depender del huso del navegador. */
function dayKey(date: Date): string {
  return DAY_KEY.format(date);
}

function yesterdayOf(now: Date): Date {
  return new Date(now.getTime() - 24 * 3_600_000);
}

/** "Ana García" → "AG". Para el avatar: no hay fotos de perfil. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0], words.at(-1)!] : words;
  return letters.map((w) => w[0]!.toLocaleUpperCase('es-AR')).join('');
}

export function formatHour(iso: string): string {
  return HOUR.format(new Date(iso));
}

/** Para la bandeja: la hora si es de hoy, "Ayer", o la fecha corta. */
export function formatInboxTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const key = dayKey(date);
  if (key === dayKey(now)) return HOUR.format(date);
  if (key === dayKey(yesterdayOf(now))) return 'Ayer';
  return SHORT_DATE.format(date).replace('.', '');
}

/** Separador de días del chat: "Hoy", "Ayer", "jueves 23 de octubre", o con año si es de otro. */
export function formatDayLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const key = dayKey(date);
  if (key === dayKey(now)) return 'Hoy';
  if (key === dayKey(yesterdayOf(now))) return 'Ayer';
  return key.slice(0, 4) === dayKey(now).slice(0, 4)
    ? LONG_DATE.format(date)
    : LONG_DATE_WITH_YEAR.format(date);
}

export interface MessageRow {
  message: ChatMessage;
  mine: boolean;
  /** El separador de día que va antes de este mensaje, si es el primero de su día. */
  dayLabel: string | null;
  /** Primero de un grupo: lleva más aire arriba. */
  groupStart: boolean;
  /** Último de un grupo: lleva la hora (y "Leído" si es mío). */
  groupEnd: boolean;
}

/**
 * Cómo se dibuja cada mensaje: los seguidos de la misma persona, el mismo día y
 * con menos de 5 minutos entre sí, van juntos y muestran la hora una sola vez al
 * final, como en cualquier mensajero.
 */
export function layoutMessages(
  messages: ChatMessage[],
  myId: string,
  now: Date = new Date(),
): MessageRow[] {
  return messages.map((message, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const day = dayKey(new Date(message.enviadoEl));
    const sameGroup = (a: ChatMessage | undefined, b: ChatMessage) =>
      a !== undefined &&
      a.autorId === b.autorId &&
      dayKey(new Date(a.enviadoEl)) === dayKey(new Date(b.enviadoEl)) &&
      Math.abs(new Date(b.enviadoEl).getTime() - new Date(a.enviadoEl).getTime()) < GROUP_GAP_MS;

    return {
      message,
      mine: message.autorId === myId,
      dayLabel:
        prev && dayKey(new Date(prev.enviadoEl)) === day
          ? null
          : formatDayLabel(message.enviadoEl, now),
      groupStart: !sameGroup(prev, message),
      groupEnd: !(next && sameGroup(message, next)),
    };
  });
}
