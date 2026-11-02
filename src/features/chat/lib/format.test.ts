import { describe, expect, it } from 'vitest';
import { formatDayLabel, formatInboxTime, initialsOf, layoutMessages } from './format';
import type { ChatMessage } from '../types/chat';

/** Mediodía en Argentina (UTC-3). */
const NOW = new Date('2026-11-02T15:00:00.000Z');

function msg(id: string, autorId: string, enviadoEl: string): ChatMessage {
  return { id, conversacionId: 'c', autorId, contenido: id, enviadoEl, leidoEl: null };
}

describe('initialsOf', () => {
  it('toma la primera y la última palabra', () => {
    expect(initialsOf('Ana García')).toBe('AG');
    expect(initialsOf('María de los Ángeles Pérez')).toBe('MP');
    expect(initialsOf('  julián ')).toBe('J');
  });
});

describe('formatInboxTime y formatDayLabel', () => {
  it('hoy, ayer y otro día, con el día de Argentina y no el del navegador', () => {
    expect(formatInboxTime('2026-11-02T13:42:00.000Z', NOW)).toBe('10:42');
    // 01:30 UTC del 2/11 todavía es el 1/11 en Argentina: es "Ayer".
    expect(formatInboxTime('2026-11-02T01:30:00.000Z', NOW)).toBe('Ayer');
    expect(formatInboxTime('2026-10-28T13:00:00.000Z', NOW)).toBe('28 oct');

    expect(formatDayLabel('2026-11-02T13:42:00.000Z', NOW)).toBe('Hoy');
    expect(formatDayLabel('2026-11-01T13:42:00.000Z', NOW)).toBe('Ayer');
    expect(formatDayLabel('2026-10-23T13:00:00.000Z', NOW)).toBe('viernes, 23 de octubre');
    expect(formatDayLabel('2025-10-23T13:00:00.000Z', NOW)).toBe('23 de octubre de 2025');
  });
});

describe('layoutMessages', () => {
  it('agrupa los seguidos de la misma persona y separa por día', () => {
    const rows = layoutMessages(
      [
        msg('a', 'yo', '2026-11-01T21:00:00.000Z'),
        msg('b', 'yo', '2026-11-01T21:02:00.000Z'),
        msg('c', 'otra', '2026-11-01T21:03:00.000Z'),
        msg('d', 'otra', '2026-11-01T21:30:00.000Z'),
        msg('e', 'otra', '2026-11-02T13:00:00.000Z'),
      ],
      'yo',
      NOW,
    );

    expect(rows.map((r) => r.dayLabel)).toEqual(['Ayer', null, null, null, 'Hoy']);
    expect(rows.map((r) => r.mine)).toEqual([true, true, false, false, false]);
    // b cierra el grupo de a; d queda solo por los 27 minutos; e, por cambiar de día.
    expect(rows.map((r) => r.groupStart)).toEqual([true, false, true, true, true]);
    expect(rows.map((r) => r.groupEnd)).toEqual([false, true, true, true, true]);
  });
});
