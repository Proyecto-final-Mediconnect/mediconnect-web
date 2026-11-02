// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { MessagesPage } from './MessagesPage';
import { SESSION_QUERY_KEY } from '../features/auth/hooks/useSession';
import type { ChatMessage, ConversationInbox } from '../features/chat/types/chat';
import { POLL_INTERVAL_MS } from '../features/chat/hooks/useChat';
import type { RealtimeStatus } from '../features/chat/lib/realtime';

/**
 * El socket se reemplaza: en los tests no hay Supabase. Cada test decide si la
 * conversación queda "en vivo" y puede empujar un mensaje como lo haría Realtime.
 */
const realtime = vi.hoisted(() => ({
  status: 'sin-conexion' as RealtimeStatus,
  push: null as ((m: ChatMessage) => void) | null,
  typing: null as (() => void) | null,
  read: null as (() => void) | null,
  notify: vi.fn(),
  notifyRead: vi.fn(),
}));
vi.mock('../features/chat/lib/realtime', () => ({
  isRealtimeConfigured: () => false,
  disconnectRealtime: () => {},
  subscribeToConversation: (
    _id: string,
    onMessage: (m: ChatMessage) => void,
    onStatus: (s: RealtimeStatus) => void,
  ) => {
    realtime.push = onMessage;
    onStatus(realtime.status);
    return () => {
      realtime.push = null;
    };
  },
  subscribeToChatSignals: (_id: string, handlers: { onTyping: () => void; onRead: () => void }) => {
    realtime.typing = handlers.onTyping;
    realtime.read = handlers.onRead;
    return {
      notifyTyping: realtime.notify,
      notifyRead: realtime.notifyRead,
      stop: () => {
        realtime.typing = null;
        realtime.read = null;
      },
    };
  },
}));

const ME = 'paciente-1';
const PRO = 'pro-1';
const CONV = 'conv-1';

function message(id: string, autorId: string, contenido: string, leidoEl: string | null = null) {
  return {
    id,
    conversacionId: CONV,
    autorId,
    contenido,
    enviadoEl: `2026-10-26T15:0${id.slice(-1)}:00.000Z`,
    leidoEl,
  };
}

function inbox(): ConversationInbox {
  return {
    conversaciones: [
      {
        id: CONV,
        contraparte: { id: PRO, nombre: 'Ana García', rol: 'PROFESIONAL' },
        ultimoMensaje: null,
        noLeidos: 1,
        creadaEl: '2026-10-20T10:00:00.000Z',
      },
    ],
    disponibles: [{ id: 'pro-2', nombre: 'Diego Ferreyra', rol: 'PROFESIONAL' }],
  };
}

function appointment(id: string, date: string, status: string, professionalId = PRO) {
  return {
    id,
    scheduledAt: `${date}T13:30:00.000Z`,
    date,
    startTime: '10:30',
    durationMinutes: 30,
    price: 15000,
    currency: 'ARS',
    status,
    professional: { id: professionalId, firstName: 'Ana', lastName: 'García' },
    patient: { id: ME, firstName: 'Julián', lastName: 'Sosa' },
  };
}

/** Los turnos del paciente: el panel del chat muestra solo los de la contraparte. */
const APPOINTMENTS = [
  appointment('t-old', '2026-08-01', 'COMPLETADO', 'pro-otro'),
  appointment('t-past', '2026-09-02', 'COMPLETADO'),
  appointment('t-cancel', '2026-09-20', 'CANCELADO'),
  appointment('t-next', '2099-01-15', 'CONFIRMADO'),
];

function json(body: unknown, status = 200): Response {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Lo que hace la otra persona al leer: marca leídos los mensajes de `author`. */
let readEverything: (author: string) => void = () => {};

/** Un backend falso con estado: lo enviado queda guardado y la marca de leído se aplica. */
function fakeBackend(options: { failSend?: boolean } = {}) {
  const messages = [message('m-1', ME, 'Hola, doctora'), message('m-2', PRO, 'Hola, Julián')];
  const calls: { method: string; url: string; body?: unknown }[] = [];
  readEverything = (author) => {
    for (const m of messages) if (m.autorId === author) m.leidoEl ??= new Date().toISOString();
  };

  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    calls.push({ method, url, body: init?.body ? JSON.parse(String(init.body)) : undefined });

    if (url.endsWith('/conversations/me')) return Promise.resolve(json(inbox()));
    if (method === 'POST' && url.endsWith('/conversations')) {
      return Promise.resolve(
        json({ ...inbox().conversaciones[0], id: 'conv-2', contraparte: inbox().disponibles[0] }),
      );
    }
    if (method === 'POST' && url.endsWith('/conversations/conv-2/messages')) {
      return Promise.resolve(json(message('m-9', ME, 'primero'), 201));
    }
    if (method === 'DELETE') return Promise.resolve(new Response(null, { status: 204 }));
    if (method === 'PATCH' && url.endsWith(`/conversations/${CONV}/read`)) {
      for (const m of messages) if (m.autorId !== ME) m.leidoEl ??= new Date().toISOString();
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    if (method === 'POST' && url.endsWith(`/conversations/${CONV}/messages`)) {
      if (options.failSend) {
        return Promise.resolve(json({ message: 'No pudimos enviar el mensaje.' }, 500));
      }
      const sent = message('m-3', ME, (calls.at(-1)!.body as { contenido: string }).contenido);
      messages.push(sent);
      return Promise.resolve(json(sent, 201));
    }
    if (url.includes(`/conversations/${CONV}/messages`)) {
      return Promise.resolve(json({ mensajes: structuredClone(messages), hayMas: false }));
    }
    if (url.endsWith('/appointments/me')) return Promise.resolve(json(APPOINTMENTS));
    return Promise.resolve(json({ message: 'no encontrado' }, 404));
  });

  return { fetchMock, calls };
}

/** Muestra la ruta actual, para verificar a dónde lleva cada acción. */
function CurrentPath() {
  return <output aria-label="ruta">{useLocation().pathname}</output>;
}

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(SESSION_QUERY_KEY, {
    id: ME,
    email: 'paciente@test.com',
    role: 'PACIENTE',
    firstName: 'Julián',
    lastName: 'Sosa',
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/mensajes/:conversationId?" element={<MessagesPage />} />
          <Route path="/mensajes/nuevo/:contraparteId" element={<MessagesPage />} />
        </Routes>
        <CurrentPath />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  realtime.status = 'sin-conexion';
  realtime.push = null;
  realtime.typing = null;
  realtime.read = null;
  realtime.notify.mockReset();
  realtime.notifyRead.mockReset();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('MessagesPage (ENG-70)', () => {
  it('lista las conversaciones con sus no leídos', async () => {
    fakeBackend();
    renderAt('/mensajes');

    const list = await screen.findByRole('list', { name: 'Conversaciones' });
    expect(within(list).getByText('Ana García')).toBeInTheDocument();
    expect(within(list).getByText('1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nuevo chat' })).toBeInTheDocument();
  });

  it('Nuevo chat ofrece a todos con quienes hubo turno, y marca con quién ya hay chat', async () => {
    const user = userEvent.setup();
    fakeBackend();
    renderAt('/mensajes');

    await user.click(await screen.findByRole('button', { name: 'Nuevo chat' }));

    const options = within(screen.getByRole('list', { name: 'Elegí con quién hablar' }));
    expect(options.getByRole('button', { name: 'Diego Ferreyra' })).toBeInTheDocument();
    expect(options.getByRole('button', { name: /Ana García.*Ya hay un chat/ })).toBeInTheDocument();
  });

  it('elegir a alguien con chat lleva a esa conversación', async () => {
    const user = userEvent.setup();
    fakeBackend();
    renderAt('/mensajes');

    await user.click(await screen.findByRole('button', { name: 'Nuevo chat' }));
    await user.click(screen.getByRole('button', { name: /Ana García/ }));

    expect(screen.getByRole('status', { name: 'ruta' })).toHaveTextContent(`/mensajes/${CONV}`);
  });

  it('elegir a alguien nuevo no crea nada hasta el primer mensaje', async () => {
    const user = userEvent.setup();
    const { calls } = fakeBackend();
    renderAt('/mensajes');

    await user.click(await screen.findByRole('button', { name: 'Nuevo chat' }));
    await user.click(screen.getByRole('button', { name: 'Diego Ferreyra' }));

    expect(
      await screen.findByText(/El chat se crea cuando mandes el primer mensaje/),
    ).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);

    await user.type(screen.getByLabelText('Mensaje para Diego Ferreyra'), 'primero{Enter}');

    await waitFor(() =>
      expect(screen.getByRole('status', { name: 'ruta' })).toHaveTextContent('/mensajes/conv-2'),
    );
    const posts = calls.filter((c) => c.method === 'POST');
    expect(posts[0]).toMatchObject({ body: { contraparteId: 'pro-2' } });
    expect(posts[1]).toMatchObject({
      url: expect.stringMatching(/\/conversations\/conv-2\/messages$/),
      body: { contenido: 'primero' },
    });
  });

  it('Borrar chat pide confirmación, explica que la otra persona lo sigue viendo y vuelve a la bandeja', async () => {
    const user = userEvent.setup();
    const { calls } = fakeBackend();
    renderAt(`/mensajes/${CONV}`);

    await screen.findByText('Hola, Julián');
    await user.click(screen.getByRole('button', { name: 'Ver información de Ana García' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Información del chat' })).getByRole('button', {
        name: 'Borrar chat',
      }),
    );

    const dialog = screen.getByRole('dialog', { name: '¿Borrar este chat?' });
    expect(dialog).toHaveTextContent('Ana García lo sigue viendo');
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);

    await user.click(within(dialog).getByRole('button', { name: 'Borrar chat' }));

    await waitFor(() =>
      expect(screen.getByRole('status', { name: 'ruta' })).toHaveTextContent(/^\/mensajes$/),
    );
    expect(calls).toContainEqual(
      expect.objectContaining({
        method: 'DELETE',
        url: expect.stringContaining(`/conversations/${CONV}`),
      }),
    );
  });

  it('muestra la conversación en orden y marca leído lo de la otra persona una sola vez', async () => {
    const { calls } = fakeBackend();
    renderAt(`/mensajes/${CONV}`);

    const thread = await screen.findByRole('list', { name: 'Mensajes con Ana García' });
    const items = within(thread).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Hola, doctora');
    expect(items[1]).toHaveTextContent('Hola, Julián');

    await waitFor(() => expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(1));
    // Después de marcar no vuelve a pedirlo: la caché ya lo tiene leído.
    await new Promise((r) => setTimeout(r, 50));
    expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(1);
  });

  it('con la pestaña oculta no marca leído; lo hace al volver a verla', async () => {
    let estado: DocumentVisibilityState = 'hidden';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => estado);
    const { calls } = fakeBackend();
    renderAt(`/mensajes/${CONV}`);

    await screen.findByRole('list', { name: 'Mensajes con Ana García' });
    await new Promise((r) => setTimeout(r, 50));
    expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(0);

    estado = 'visible';
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => expect(calls.filter((c) => c.method === 'PATCH')).toHaveLength(1));
  });

  it('el pedido periódico trae solo la página más reciente, no todo el historial', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { calls } = fakeBackend();
    renderAt(`/mensajes/${CONV}`);
    await screen.findByRole('list', { name: 'Mensajes con Ana García' });
    const pedidos = () =>
      calls.filter((c) => c.method === 'GET' && c.url.includes(`/conversations/${CONV}/messages`));
    const antes = pedidos().length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS + 100);
    });

    const nuevos = pedidos().slice(antes);
    expect(nuevos).toHaveLength(1);
    expect(nuevos[0].url).not.toContain('antesDe');
    vi.useRealTimers();
  });

  it('el nombre abre el panel con el próximo turno y los anteriores con esa persona', async () => {
    const user = userEvent.setup();
    fakeBackend();
    renderAt(`/mensajes/${CONV}`);

    // El próximo turno también se ve en el encabezado, sin abrir nada.
    expect(
      (await screen.findAllByRole('link', { name: /Próximo turno: .* 10:30/ }))[0],
    ).toHaveAttribute('href', '/turnos/t-next');

    await user.click(screen.getByRole('button', { name: 'Ver información de Ana García' }));

    const panel = within(screen.getByRole('dialog', { name: 'Información del chat' }));
    expect(panel.getByRole('link', { name: 'Ver el turno' })).toHaveAttribute(
      'href',
      '/turnos/t-next',
    );
    expect(
      panel.getByRole('link', { name: /2 de septiembre de 2026.*Completado/ }),
    ).toBeInTheDocument();
    // Los cancelados y los turnos con otras personas no van.
    expect(panel.queryByText(/Cancelado/)).not.toBeInTheDocument();
    expect(panel.queryByText(/1 de agosto/)).not.toBeInTheDocument();
    expect(panel.getByRole('link', { name: 'Ver perfil' })).toHaveAttribute(
      'href',
      `/profesionales/${PRO}`,
    );
  });

  it('en vivo, un mensaje que llega por el socket aparece sin duplicarse', async () => {
    realtime.status = 'en-vivo';
    fakeBackend();
    renderAt(`/mensajes/${CONV}`);

    await screen.findByText('Hola, Julián');

    realtime.push?.(message('m-4', PRO, '¿Cómo seguís?'));
    realtime.push?.(message('m-4', PRO, '¿Cómo seguís?'));

    expect(await screen.findByText('¿Cómo seguís?')).toBeInTheDocument();
    expect(screen.getAllByText('¿Cómo seguís?')).toHaveLength(1);
  });

  it('muestra cuando la otra persona escribe, y lo saca cuando llega su mensaje', async () => {
    realtime.status = 'en-vivo';
    fakeBackend();
    renderAt(`/mensajes/${CONV}`);
    await screen.findByText('Hola, Julián');

    act(() => realtime.typing?.());
    expect(await screen.findByText('Ana García está escribiendo')).toBeInTheDocument();

    act(() => realtime.push?.(message('m-5', PRO, 'Ya te paso el estudio')));
    await screen.findByText('Ya te paso el estudio');
    expect(screen.queryByText('Ana García está escribiendo')).not.toBeInTheDocument();
  });

  it('al marcar leído se lo avisa a la otra persona', async () => {
    fakeBackend();
    renderAt(`/mensajes/${CONV}`);

    await waitFor(() => expect(realtime.notifyRead).toHaveBeenCalledTimes(1));
  });

  it('cuando la otra persona lee, el "Leído" aparece sin esperar la reconciliación', async () => {
    const { calls } = fakeBackend();
    renderAt(`/mensajes/${CONV}`);
    await screen.findByText('Hola, doctora');
    expect(screen.queryByText('Leído')).not.toBeInTheDocument();

    // Del lado de Ana: lee el chat (el backend guarda read_at) y avisa.
    const before = calls.length;
    readEverything(ME);
    act(() => realtime.read?.());

    expect(await screen.findByText('Leído')).toBeInTheDocument();
    expect(calls.slice(before).some((c) => c.url.includes(`/conversations/${CONV}/messages`))).toBe(
      true,
    );
  });

  it('al escribir avisa a la otra persona; con espacios solos, no', async () => {
    const user = userEvent.setup();
    fakeBackend();
    renderAt(`/mensajes/${CONV}`);
    const field = await screen.findByLabelText('Mensaje para Ana García');

    await user.type(field, '   ');
    expect(realtime.notify).not.toHaveBeenCalled();

    await user.type(field, 'Hola');
    expect(realtime.notify).toHaveBeenCalled();
  });

  it('enviar con Enter guarda el mensaje recortado y limpia el borrador', async () => {
    const user = userEvent.setup();
    const { calls } = fakeBackend();
    renderAt(`/mensajes/${CONV}`);

    const box = await screen.findByLabelText('Mensaje para Ana García');
    await user.type(box, '  Llevo los estudios el jueves  {Enter}');

    expect(await screen.findByText('Llevo los estudios el jueves')).toBeInTheDocument();
    expect(box).toHaveValue('');
    expect(calls).toContainEqual(
      expect.objectContaining({
        method: 'POST',
        body: { contenido: 'Llevo los estudios el jueves' },
      }),
    );
  });

  it('si el envío falla, lo escrito queda para reintentar', async () => {
    const user = userEvent.setup();
    fakeBackend({ failSend: true });
    renderAt(`/mensajes/${CONV}`);

    const box = await screen.findByLabelText('Mensaje para Ana García');
    await user.type(box, 'No se tiene que perder{Enter}');

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos enviar el mensaje.');
    expect(box).toHaveValue('No se tiene que perder');
  });

  it('un mensaje vacío no se puede enviar', async () => {
    const user = userEvent.setup();
    fakeBackend();
    renderAt(`/mensajes/${CONV}`);

    await user.type(await screen.findByLabelText('Mensaje para Ana García'), '   ');

    expect(screen.getByRole('button', { name: 'Enviar mensaje' })).toBeDisabled();
  });

  it('una conversación que no está en mi bandeja no se abre', async () => {
    fakeBackend();
    renderAt('/mensajes/otra');

    expect(await screen.findByText('Esa conversación no existe o no es tuya.')).toBeInTheDocument();
  });
});
