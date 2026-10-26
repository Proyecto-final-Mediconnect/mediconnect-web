// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { MessagesPage } from './MessagesPage';
import { SESSION_QUERY_KEY } from '../features/auth/hooks/useSession';
import type { ChatMessage, ConversationInbox } from '../features/chat/types/chat';
import type { RealtimeStatus } from '../features/chat/lib/realtime';

/**
 * El socket se reemplaza: en los tests no hay Supabase. Cada test decide si la
 * conversación queda "en vivo" y puede empujar un mensaje como lo haría Realtime.
 */
const realtime = vi.hoisted(() => ({
  status: 'sin-conexion' as RealtimeStatus,
  push: null as ((m: ChatMessage) => void) | null,
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

function json(body: unknown, status = 200): Response {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Un backend falso con estado: lo enviado queda guardado y la marca de leído se aplica. */
function fakeBackend(options: { failSend?: boolean } = {}) {
  const messages = [message('m-1', ME, 'Hola, doctora'), message('m-2', PRO, 'Hola, Julián')];
  const calls: { method: string; url: string; body?: unknown }[] = [];

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
    expect(screen.getByRole('button', { name: '+ Nuevo chat' })).toBeInTheDocument();
  });

  it('Nuevo chat ofrece a todos con quienes hubo turno, y marca con quién ya hay chat', async () => {
    const user = userEvent.setup();
    fakeBackend();
    renderAt('/mensajes');

    await user.click(await screen.findByRole('button', { name: '+ Nuevo chat' }));

    const options = within(screen.getByRole('list', { name: 'Elegí con quién hablar' }));
    expect(options.getByRole('button', { name: 'Diego Ferreyra' })).toBeInTheDocument();
    expect(options.getByRole('button', { name: /Ana García.*Ya hay un chat/ })).toBeInTheDocument();
  });

  it('elegir a alguien con chat lleva a esa conversación', async () => {
    const user = userEvent.setup();
    fakeBackend();
    renderAt('/mensajes');

    await user.click(await screen.findByRole('button', { name: '+ Nuevo chat' }));
    await user.click(screen.getByRole('button', { name: /Ana García/ }));

    expect(screen.getByRole('status', { name: 'ruta' })).toHaveTextContent(`/mensajes/${CONV}`);
  });

  it('elegir a alguien nuevo no crea nada hasta el primer mensaje', async () => {
    const user = userEvent.setup();
    const { calls } = fakeBackend();
    renderAt('/mensajes');

    await user.click(await screen.findByRole('button', { name: '+ Nuevo chat' }));
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
    await user.click(screen.getByRole('button', { name: 'Borrar chat' }));

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

  it('sin Realtime dice que se actualiza cada pocos segundos', async () => {
    fakeBackend();
    renderAt(`/mensajes/${CONV}`);

    expect(await screen.findByText('Se actualiza cada pocos segundos')).toBeInTheDocument();
  });

  it('en vivo, un mensaje que llega por el socket aparece sin duplicarse', async () => {
    realtime.status = 'en-vivo';
    fakeBackend();
    renderAt(`/mensajes/${CONV}`);

    expect(await screen.findByText('En vivo')).toBeInTheDocument();
    await screen.findByText('Hola, Julián');

    realtime.push?.(message('m-4', PRO, '¿Cómo seguís?'));
    realtime.push?.(message('m-4', PRO, '¿Cómo seguís?'));

    expect(await screen.findByText('¿Cómo seguís?')).toBeInTheDocument();
    expect(screen.getAllByText('¿Cómo seguís?')).toHaveLength(1);
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

    expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
  });

  it('una conversación que no está en mi bandeja no se abre', async () => {
    fakeBackend();
    renderAt('/mensajes/otra');

    expect(await screen.findByText('Esa conversación no existe o no es tuya.')).toBeInTheDocument();
  });
});
