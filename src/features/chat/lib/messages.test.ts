import { describe, expect, it } from 'vitest';
import { fromRow, mergeMessages } from './messages';
import type { ChatMessage } from '../types/chat';

function msg(id: string, enviadoEl: string, leidoEl: string | null = null): ChatMessage {
  return { id, conversacionId: 'c', autorId: 'a', contenido: id, enviadoEl, leidoEl };
}

/** ENG-70 — la reconciliación entre lo que llega por HTTP y por Realtime. */
describe('mergeMessages', () => {
  it('no repite un mensaje que llegó por los dos caminos', () => {
    const http = [msg('m-1', '2026-10-26T10:00:00.000Z'), msg('m-2', '2026-10-26T10:01:00.000Z')];
    const socket = [msg('m-2', '2026-10-26T10:01:00.000Z')];

    expect(mergeMessages(http, socket).map((m) => m.id)).toEqual(['m-1', 'm-2']);
  });

  it('ordena por fecha y desempata por id, como el backend', () => {
    const at = '2026-10-26T10:00:00.000Z';
    const merged = mergeMessages(
      [msg('b', at), msg('z', '2026-10-26T09:00:00.000Z')],
      [msg('a', at)],
    );

    expect(merged.map((m) => m.id)).toEqual(['z', 'a', 'b']);
  });

  it('gana la versión más nueva: trae el leído', () => {
    const at = '2026-10-26T10:00:00.000Z';
    const read = '2026-10-26T10:05:00.000Z';

    expect(mergeMessages([msg('m-1', at)], [msg('m-1', at, read)])[0].leidoEl).toBe(read);
  });
});

describe('fromRow', () => {
  it('pasa la fila de Postgres a la forma de la API, con fechas ISO', () => {
    expect(
      fromRow({
        id: 'm-1',
        conversation_id: 'c-1',
        sender_id: 'u-1',
        content: 'Hola',
        created_at: '2026-10-26 18:17:07.568+00',
        read_at: null,
      }),
    ).toEqual({
      id: 'm-1',
      conversacionId: 'c-1',
      autorId: 'u-1',
      contenido: 'Hola',
      enviadoEl: '2026-10-26T18:17:07.568Z',
      leidoEl: null,
    });
  });
});
