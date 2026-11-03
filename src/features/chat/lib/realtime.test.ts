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
    send: vi.fn(),
    subscribe: vi.fn((cb?: (status: string) => void) => {
      cb?.('SUBSCRIBED');
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
    return {
      channel: vi.fn(fakeChannel),
      removeChannel: vi.fn(),
      removeAllChannels: vi.fn(),
      realtime: { disconnect: vi.fn() },
    };
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

  it('si falló iniciar Realtime, la próxima suscripción lo reintenta', async () => {
    supabase.createClient.mockImplementationOnce(() => {
      throw new Error('chunk caído');
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { subscribeToConversation } = await load({ url: 'https://x.supabase.co', key: 'k' });

    subscribeToConversation('c-1', vi.fn(), vi.fn());
    await settled();
    const onStatus = vi.fn();
    subscribeToConversation('c-1', vi.fn(), onStatus);
    await settled();

    expect(supabase.createClient).toHaveBeenCalledTimes(2);
    expect(onStatus).toHaveBeenLastCalledWith('en-vivo');
  });

  it('un token en vuelo al cerrar sesión no se guarda para el próximo usuario', async () => {
    let resolverViejo!: (v: { accessToken: string; expiraEl: string }) => void;
    getRealtimeToken
      .mockReturnValueOnce(new Promise((resolve) => (resolverViejo = resolve)))
      .mockResolvedValue({
        accessToken: 't-nuevo',
        expiraEl: new Date(Date.now() + 3_600_000).toISOString(),
      });
    const { subscribeToConversation, disconnectRealtime } = await load({
      url: 'https://x.supabase.co',
      key: 'k',
    });
    subscribeToConversation('c-1', vi.fn(), vi.fn());
    await settled();
    const clienteViejo = supabase.createClient.mock.results[0].value;
    const accessTokenViejo = supabase.accessToken!;

    const enVuelo = accessTokenViejo();
    disconnectRealtime();
    resolverViejo({
      accessToken: 't-viejo',
      expiraEl: new Date(Date.now() + 3_600_000).toISOString(),
    });
    await enVuelo;
    await settled();

    // Corta el socket, no solo los canales.
    expect(clienteViejo.realtime.disconnect).toHaveBeenCalled();
    // El token del usuario anterior no quedó en la caché.
    expect(await accessTokenViejo()).toBe('t-nuevo');
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

  it('"escribiendo" va por un canal privado y se avisa como mucho cada tanto', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { subscribeToChatSignals, TYPING_SEND_EVERY_MS } = await load({
      url: 'https://x.supabase.co',
      key: 'k',
    });

    const signals = subscribeToChatSignals('c-1', { onTyping: vi.fn(), onRead: vi.fn() });
    await settled();

    const client = supabase.createClient.mock.results[0]!.value;
    expect(client.channel).toHaveBeenCalledWith('typing:c-1', { config: { private: true } });
    const channel = client.channel.mock.results[0]!.value;

    signals.notifyTyping();
    signals.notifyTyping();
    expect(channel.send).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(TYPING_SEND_EVERY_MS);
    signals.notifyTyping();
    expect(channel.send).toHaveBeenCalledTimes(2);

    // "Leí" no se espacia: se manda cada vez que se marca leído.
    signals.notifyRead();
    expect(channel.send).toHaveBeenLastCalledWith({
      type: 'broadcast',
      event: 'leido',
      payload: {},
    });
    expect(channel.send).toHaveBeenCalledTimes(3);

    signals.stop();
    vi.advanceTimersByTime(TYPING_SEND_EVERY_MS);
    signals.notifyTyping();
    expect(channel.send).toHaveBeenCalledTimes(3);
  });

  it('un "leí" pedido antes de unirse al canal se manda apenas queda unido', async () => {
    let joined: ((status: string) => void) | undefined;
    supabase.createClient.mockImplementation((_u, _k, options) => {
      supabase.accessToken = options.accessToken;
      const channel = {
        on: vi.fn(() => channel),
        send: vi.fn(),
        subscribe: vi.fn((cb: (status: string) => void) => {
          joined = cb;
          return channel;
        }),
      };
      return { channel: vi.fn(() => channel), removeChannel: vi.fn() };
    });
    const { subscribeToChatSignals } = await load({ url: 'https://x.supabase.co', key: 'k' });

    const signals = subscribeToChatSignals('c-1', { onTyping: vi.fn(), onRead: vi.fn() });
    await settled();
    const channel = supabase.createClient.mock.results[0]!.value.channel.mock.results[0]!.value;

    // Todavía uniéndose: ni "escribiendo" ni "leí" salen.
    signals.notifyRead();
    signals.notifyTyping();
    expect(channel.send).not.toHaveBeenCalled();

    joined?.('SUBSCRIBED');
    expect(channel.send).toHaveBeenCalledTimes(1);
    expect(channel.send).toHaveBeenCalledWith({ type: 'broadcast', event: 'leido', payload: {} });
  });

  it('sin variables de Supabase no hay indicador de escribiendo', async () => {
    const { subscribeToChatSignals } = await load({});

    expect(() =>
      subscribeToChatSignals('c-1', { onTyping: vi.fn(), onRead: vi.fn() }).notifyTyping(),
    ).not.toThrow();
    expect(supabase.createClient).not.toHaveBeenCalled();
  });
});
