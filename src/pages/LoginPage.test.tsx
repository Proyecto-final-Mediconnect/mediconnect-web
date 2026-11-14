// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, type InitialEntry } from 'react-router-dom';
import { LoginPage } from './LoginPage';

/**
 * El aviso de "ingresá para seguir": aparece cuando RequireAuth mandó al login
 * a alguien que quiso entrar a una pantalla con sesión (trae `state.from`).
 */

const AVISO = /Para seguir, ingresá con tu cuenta/;

function renderLogin(entrada: InitialEntry) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 401 }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entrada]}>
        <Routes>
          <Route path="/ingresar" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LoginPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('avisa que hay que ingresar para seguir si viene de una pantalla con sesión', () => {
    renderLogin({
      pathname: '/ingresar',
      state: { from: { pathname: '/profesionales/abc/turnos' } },
    });

    expect(screen.getByRole('status')).toHaveTextContent(AVISO);
  });

  it('sin `from` no muestra el aviso', () => {
    renderLogin('/ingresar');

    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
  });

  it('después de dar de baja la cuenta muestra solo esa confirmación', () => {
    renderLogin({
      pathname: '/ingresar',
      search: '?baja=1',
      state: { from: { pathname: '/perfil' } },
    });

    expect(screen.getByRole('status')).toHaveTextContent(/Tu cuenta se dio de baja/);
    expect(screen.queryByText(AVISO)).not.toBeInTheDocument();
  });
});
