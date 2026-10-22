// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationsBell } from './NotificationsBell';
import type { InAppInbox } from '../types/notification';

const INBOX: InAppInbox = {
  unreadCount: 1,
  notifications: [
    {
      id: 'n-1',
      type: 'PAGO_CONFIRMADO',
      appointmentId: 'turno-1',
      title: 'Turno nuevo confirmado',
      body: 'Julián Pérez reservó y pagó un turno para el viernes, 23 de octubre a las 10:30.',
      createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
      readAt: null,
    },
    {
      id: 'n-2',
      type: 'TURNO_CANCELADO',
      appointmentId: 'turno-2',
      title: 'Turno cancelado',
      body: 'Marina Sosa canceló su turno. El horario quedó libre.',
      createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      readAt: new Date().toISOString(),
    },
  ],
};

function json(body: unknown, status = 200): Response {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Un servidor falso con estado: el PATCH marca el aviso y la próxima lectura
 *  ya lo trae leído, como el backend de verdad. */
function renderBell(initial: InAppInbox = INBOX) {
  let inbox = structuredClone(initial);
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    if (init?.method === 'PATCH') {
      const id = String(input).match(/\/notifications\/([^/]+)\/read/)?.[1];
      const notifications = inbox.notifications.map((n) =>
        n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n,
      );
      inbox = {
        notifications,
        unreadCount: notifications.filter((n) => !n.readAt).length,
      };
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return Promise.resolve(json(inbox));
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <NotificationsBell />
    </QueryClientProvider>,
  );
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('NotificationsBell', () => {
  it('muestra cuántos avisos hay sin leer', async () => {
    renderBell();

    expect(await screen.findByRole('button', { name: 'Avisos, 1 sin leer' })).toBeInTheDocument();
  });

  it('sin avisos sin leer no muestra contador', async () => {
    renderBell({ unreadCount: 0, notifications: [] });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Avisos' })).toBeInTheDocument());
  });

  it('al abrirla lista los avisos con su texto', async () => {
    const user = userEvent.setup();
    renderBell();

    await user.click(await screen.findByRole('button', { name: 'Avisos, 1 sin leer' }));

    expect(screen.getByText('Turno nuevo confirmado')).toBeInTheDocument();
    expect(screen.getByText(/Julián Pérez reservó y pagó/)).toBeInTheDocument();
    expect(screen.getByText('hace 5 minutos')).toBeInTheDocument();
  });

  it('tocar un aviso sin leer lo marca como leído y baja el contador', async () => {
    const user = userEvent.setup();
    const fetchMock = renderBell();

    await user.click(await screen.findByRole('button', { name: 'Avisos, 1 sin leer' }));
    await user.click(screen.getByRole('button', { name: /^Sin leer: Turno nuevo confirmado/ }));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/notifications/n-1/read'),
      expect.objectContaining({ method: 'PATCH' }),
    );
    expect(screen.getByRole('button', { name: 'Avisos' })).toBeInTheDocument();
  });

  it('tocar uno ya leído no vuelve a pedir nada', async () => {
    const user = userEvent.setup();
    const fetchMock = renderBell();

    await user.click(await screen.findByRole('button', { name: 'Avisos, 1 sin leer' }));
    await user.click(screen.getByRole('button', { name: /^Turno cancelado/ }));

    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  it('sin avisos lo dice', async () => {
    const user = userEvent.setup();
    renderBell({ unreadCount: 0, notifications: [] });

    await user.click(await screen.findByRole('button', { name: 'Avisos' }));

    expect(await screen.findByText('No tenés avisos todavía.')).toBeInTheDocument();
  });

  it('se cierra con Escape', async () => {
    const user = userEvent.setup();
    renderBell();

    await user.click(await screen.findByRole('button', { name: 'Avisos, 1 sin leer' }));
    expect(screen.getByRole('region', { name: 'Avisos' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('region', { name: 'Avisos' })).not.toBeInTheDocument();
  });
});
