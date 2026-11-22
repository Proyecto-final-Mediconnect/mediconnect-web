// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AdminDashboardPage } from './AdminDashboardPage';

const ADMIN = { id: 'a1', email: 'admin@test.com', role: 'ADMINISTRADOR' };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderPage(adminMe: () => Response) {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input);
    if (url.includes('/admin/me')) return Promise.resolve(adminMe());
    if (url.includes('/admin/professionals/licenses')) {
      return Promise.resolve(json([{ id: 'p1' }, { id: 'p2' }]));
    }
    if (url.includes('/notifications/me')) {
      return Promise.resolve(json({ unreadCount: 0, notifications: [] }));
    }
    return Promise.resolve(json({ ...ADMIN, firstName: null, lastName: null }));
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/admin']}>
        <AdminDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** ENG-240 — el panel confirma el acceso con el backend. */
describe('Panel del administrador', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('confirma con /admin/me quién administra', async () => {
    renderPage(() => json(ADMIN));

    expect(await screen.findByRole('heading', { name: 'Administración' })).toBeInTheDocument();
    expect(await screen.findByText(/Entraste como/)).toHaveTextContent(
      'Entraste como admin@test.com.',
    );
  });

  it('muestra cuántos profesionales esperan la validación, con el link (ENG-192)', async () => {
    renderPage(() => json(ADMIN));

    const link = await screen.findByRole('link', { name: /esperan la validación/ });
    expect(link).toHaveAttribute('href', '/admin/matriculas');
    expect(
      await screen.findByText('2 profesionales esperan la validación de su matrícula.'),
    ).toBeInTheDocument();
  });

  it('si el backend no lo deja entrar, lo dice y deja reintentar', async () => {
    let intentos = 0;
    renderPage(() => {
      intentos += 1;
      return intentos === 1
        ? json({ message: 'No tenés permiso para entrar acá.' }, 403)
        : json(ADMIN);
    });

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('No tenés permiso para entrar acá.');
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText(/Entraste como/)).toHaveTextContent(
      'Entraste como admin@test.com.',
    );
  });
});
