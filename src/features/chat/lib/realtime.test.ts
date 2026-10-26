import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * ENG-70 — la conexión a Realtime: cuándo no se conecta y cómo maneja el token.
 * `createClient` se reemplaza para capturar el callback `accessToken`, que es lo
 * que Realtime llama en cada heartbeat.
 */
const supabase = vi.hoisted(() => ({
  createClient: vi.fn(),
  accessToken: null as null | (() => Promise<string>),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: supabase.createClient }));

const getRealtimeToken = vi.hoisted(() => vi.fn());
vi.mock('../api/chatApi', () => ({ getRealtimeToken }));

function fakeChannel() {
  const channel = {
    on: vi.fn(() => channel),
    subscribe: vi.fn((cb: (status: string) => void) => {
      cb('SUBSCRIBED');
      return channel;
    }),
  };
  return channel;
}

/** `supabase-js` se importa de forma diferida: hay que esperar a que llegue. */
async function settled() {
  await vi.dynamicImportSettled();
  await Promise.resolve();
}

async function load(env: { url?: string; key?: string }) {
  vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL', env.url ?? '');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', env.key ?? '');
  return import('./realtime');
}

beforeEach(() => {
  supabase.createClient.mockReset().mockImplementation((_u, _k, options) => {
    supabase.accessToken = options.accessToken;
    return { channel: vi.fn(fakeChannel), removeChannel: vi.fn(), removeAllChannels: vi.fn() };
  });
  getRealtimeToken.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('realtime', () => {
  it('sin variables de Supabase no se conecta y avisa que queda sin conexión', async () => {
    const { subscribeToConversation } = await load({});
    const onStatus = vi.fn();

    subscribeToConversation('c-1', vi.fn(), onStatus);

    expect(onStatus).toHaveBeenCalledWith('sin-conexion');
    expect(supabase.createClient).not.toHaveBeenCalled();
  });

  it('una URL mal cargada no rompe la pantalla: queda sin conexión', async () => {
    supabase.createClient.mockImplementation(() => {
      throw new Error('Invalid supabaseUrl');
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { subscribeToConversation } = await load({ url: 'no-es-url', key: 'k' });
    const onStatus = vi.fn();

    expect(() => subscribeToConversation('c-1', vi.fn(), onStatus)).not.toThrow();
    await settled();
    expect(onStatus).toHaveBeenCalledWith('sin-conexion');
  });

  it('pide el token una vez, lo reusa y lo renueva cuando está por vencer', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-26T15:00:00.000Z') });
    getRealtimeToken
      .mockResolvedValueOnce({ accessToken: 't-1', expiraEl: '2026-10-26T16:00:00.000Z' })
      .mockResolvedValueOnce({ accessToken: 't-2', expiraEl: '2026-10-26T17:00:00.000Z' });
    const { subscribeToConversation } = await load({ url: 'https://x.supabase.co', key: 'k' });
    const onStatus = vi.fn();

    subscribeToConversation('c-1', vi.fn(), onStatus);
    await settled();

    expect(onStatus).toHaveBeenLastCalledWith('en-vivo');
    expect(await supabase.accessToken!()).toBe('t-1');
    expect(await supabase.accessToken!()).toBe('t-1');
    expect(getRealtimeToken).toHaveBeenCalledTimes(1);

    // A 1 minuto del vencimiento ya pide otro.
    vi.setSystemTime(new Date('2026-10-26T15:59:00.000Z'));
    expect(await supabase.accessToken!()).toBe('t-2');
    expect(getRealtimeToken).toHaveBeenCalledTimes(2);
  });

  it('sin sesión el token sale vacío, y al cerrar sesión se olvida', async () => {
    getRealtimeToken.mockRejectedValueOnce(new Error('401')).mockResolvedValue({
      accessToken: 't-1',
      expiraEl: new Date(Date.now() + 3_600_000).toISOString(),
    });
    const { subscribeToConversation, disconnectRealtime } = await load({
      url: 'https://x.supabase.co',
      key: 'k',
    });
    subscribeToConversation('c-1', vi.fn(), vi.fn());
    await settled();

    expect(await supabase.accessToken!()).toBe('');
    expect(await supabase.accessToken!()).toBe('t-1');

    disconnectRealtime();
    await supabase.accessToken!();
    expect(getRealtimeToken).toHaveBeenCalledTimes(3);
  });
});
