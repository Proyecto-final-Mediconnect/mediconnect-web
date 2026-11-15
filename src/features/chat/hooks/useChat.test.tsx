// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const api = vi.hoisted(() => ({ getMessages: vi.fn() }));
vi.mock('../api/chatApi', () => ({
  getMessages: api.getMessages,
  getMyConversations: vi.fn(),
  hideConversation: vi.fn(),
  markConversationRead: vi.fn(),
  openConversation: vi.fn(),
  sendAttachment: vi.fn(),
  sendMessage: vi.fn(),
}));

const rt = vi.hoisted(() => ({
  signals: null as null | { onRead: () => void; onMessage: () => void },
  inbox: null as null | (() => void),
}));
vi.mock('../lib/realtime', () => ({
  subscribeToConversation: () => () => {},
  subscribeToChatSignals: (
    _id: string,
    handlers: { onRead: () => void; onMessage: () => void },
  ) => {
    rt.signals = handlers;
    return {
      notifyTyping: () => {},
      notifyRead: () => {},
      notifyMessage: () => {},
      stop: () => {},
    };
  },
  subscribeToInbox: (onChange: () => void) => {
    rt.inbox = onChange;
    return () => {};
  },
}));

import {
  CHAT_INBOX_KEY,
  INVALIDATE_COALESCE_MS,
  RECONCILE_MIN_GAP_MS,
  useChatSignals,
  useInboxRealtime,
} from './useChat';

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

beforeEach(() => {
  vi.useFakeTimers();
  client = new QueryClient();
  api.getMessages.mockReset().mockResolvedValue({ mensajes: [], hayMas: false });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useChatSignals, frecuencia de los refetch', () => {
  it('50 avisos "leí"/"mensaje" seguidos no hacen un pedido por aviso', async () => {
    renderHook(() => useChatSignals('c1'), { wrapper });

    await act(async () => {
      for (let i = 0; i < 25; i++) {
        rt.signals!.onRead();
        rt.signals!.onMessage();
      }
    });
    expect(api.getMessages).toHaveBeenCalledTimes(1);

    // Termina el primero: los demás se juntan en un único pedido, después de la pausa.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(RECONCILE_MIN_GAP_MS + 50);
    });
    expect(api.getMessages).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(RECONCILE_MIN_GAP_MS * 4);
    });
    expect(api.getMessages).toHaveBeenCalledTimes(2);
  });

  it('los avisos de "mensaje" juntan las invalidaciones de la bandeja en una', async () => {
    const spy = vi.spyOn(client, 'invalidateQueries');
    renderHook(() => useChatSignals('c2'), { wrapper });

    await act(async () => {
      for (let i = 0; i < 10; i++) rt.signals!.onMessage();
    });
    expect(spy).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(INVALIDATE_COALESCE_MS + 10);
    });
    expect(spy.mock.calls.filter(([f]) => f?.queryKey === CHAT_INBOX_KEY)).toHaveLength(1);
  });
});

describe('useInboxRealtime', () => {
  it('una ráfaga de mensajes invalida la bandeja y las notificaciones una vez por ventana', async () => {
    const spy = vi.spyOn(client, 'invalidateQueries');
    renderHook(() => useInboxRealtime(), { wrapper });

    act(() => {
      for (let i = 0; i < 20; i++) rt.inbox!();
    });
    expect(spy).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(INVALIDATE_COALESCE_MS + 10);
    });

    expect(spy).toHaveBeenCalledTimes(2);
    const keys = spy.mock.calls.map(([f]) => JSON.stringify(f?.queryKey));
    expect(keys).toContain(JSON.stringify(CHAT_INBOX_KEY));
    expect(keys).toContain(JSON.stringify(['notifications', 'me']));
  });
});
