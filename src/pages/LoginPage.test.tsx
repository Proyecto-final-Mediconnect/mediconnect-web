// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation, type InitialEntry } from 'react-router-dom';
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
          <Route
            path="/ingresar"
            element={
              <>
                <LoginPage />
                <UrlActual />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Lo que queda en la barra de direcciones. */
function UrlActual() {
  const { pathname, search, hash } = useLocation();
  return <span data-testid="url">{`${pathname}${search}${hash}`}</span>;
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

  // ENG-235: el enlace del mail de confirmación del registro vuelve acá.
  describe('al volver del enlace de confirmación del registro', () => {
    it('dice que el email quedó confirmado y que se puede ingresar también desde la app', () => {
      renderLogin('/ingresar#access_token=abc&refresh_token=def&type=signup');

      expect(screen.getByRole('status')).toHaveTextContent(
        'Tu email quedó confirmado. Ya podés ingresar, acá o desde la app de MediConnect.',
      );
    });

    it('saca los tokens de la URL', () => {
      renderLogin('/ingresar#access_token=abc&refresh_token=def&type=signup');

      expect(screen.getByTestId('url')).toHaveTextContent(/^\/ingresar$/);
    });

    it('si el enlace venció o ya se usó, lo dice y cómo pedir otro', () => {
      renderLogin(
        '/ingresar#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
      );

      expect(screen.getByRole('alert')).toHaveTextContent(/venció o ya se usó/);
      expect(screen.getByRole('alert')).toHaveTextContent(/registrate de nuevo con el mismo email/);
      expect(screen.getByTestId('url')).toHaveTextContent(/^\/ingresar$/);
    });

    it('un fragmento que no es de la confirmación no muestra nada ni toca la URL', () => {
      renderLogin('/ingresar#algo');

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.getByTestId('url')).toHaveTextContent('/ingresar#algo');
    });
  });
});
