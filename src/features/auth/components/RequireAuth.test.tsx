// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';
import type { SessionUser } from '../types/session';

const PACIENTE: SessionUser = {
  id: 'u1',
  email: 'p@test.com',
  role: 'PACIENTE',
  firstName: 'Ana',
  lastName: 'Gómez',
};

/** Monta RequireAuth con la respuesta de `GET /me` mockeada. */
function renderGuarded(
  meResponse: { status: number; body?: unknown },
  allow?: SessionUser['role'][],
) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(meResponse.body ? JSON.stringify(meResponse.body) : null, {
      status: meResponse.status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/privado']}>
        <Routes>
          <Route
            path="/privado"
            element={
              <RequireAuth allow={allow}>
                <div>CONTENIDO PRIVADO</div>
              </RequireAuth>
            }
          />
          <Route path="/ingresar" element={<div>PANTALLA DE LOGIN</div>} />
          <Route path="/paciente" element={<div>DASHBOARD PACIENTE</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('RequireAuth (ENG-44)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('sin sesión (401) redirige al login', async () => {
    renderGuarded({ status: 401 });
    expect(await screen.findByText('PANTALLA DE LOGIN')).toBeInTheDocument();
    expect(screen.queryByText('CONTENIDO PRIVADO')).not.toBeInTheDocument();
  });

  it('con sesión válida muestra el contenido protegido', async () => {
    renderGuarded({ status: 200, body: PACIENTE });
    expect(await screen.findByText('CONTENIDO PRIVADO')).toBeInTheDocument();
  });

  it('con un rol no permitido redirige al dashboard propio del usuario', async () => {
    // Un PACIENTE entrando a una ruta solo para PROFESIONAL.
    renderGuarded({ status: 200, body: PACIENTE }, ['PROFESIONAL']);
    expect(await screen.findByText('DASHBOARD PACIENTE')).toBeInTheDocument();
    expect(screen.queryByText('CONTENIDO PRIVADO')).not.toBeInTheDocument();
  });
});
