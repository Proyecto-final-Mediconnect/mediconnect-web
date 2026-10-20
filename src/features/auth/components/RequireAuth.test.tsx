// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';
import type { SessionUser } from '../types/session';
import { LEGAL_VERSION } from '../../legal/legal';

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

  describe('consentimiento (ENG-140)', () => {
    it('sin aceptar los textos vigentes muestra el pedido de consentimiento, no la app', async () => {
      renderGuarded({ status: 200, body: { ...PACIENTE, legalAccepted: false } });

      expect(
        await screen.findByRole('heading', { name: /necesitamos tu consentimiento/i }),
      ).toBeInTheDocument();
      expect(screen.queryByText('CONTENIDO PRIVADO')).not.toBeInTheDocument();
    });

    it('un backend que no informa el campo no bloquea a nadie', async () => {
      // `PACIENTE` no trae `legalAccepted`, como un backend anterior a ENG-140.
      renderGuarded({ status: 200, body: PACIENTE });
      expect(await screen.findByText('CONTENIDO PRIVADO')).toBeInTheDocument();
    });

    // Si el backend publicó textos más nuevos que los de este bundle, aceptar
    // mandaría la versión vieja y el backend la rechazaría en cada intento: el
    // gate pediría lo mismo para siempre y la única salida sería cerrar sesión.
    it('si el backend tiene una versión más nueva, ofrece recargar en vez de aceptar', async () => {
      renderGuarded({
        status: 200,
        body: { ...PACIENTE, legalAccepted: false, legalVersion: '2099-01-01' },
      });

      expect(
        await screen.findByRole('heading', { name: /actualizamos los términos/i }),
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /recargar la página/i })).toBeVisible();
      // No se ofrece aceptar unos textos distintos de los que se muestran.
      expect(
        screen.queryByRole('button', { name: /aceptar y continuar/i }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText('CONTENIDO PRIVADO')).not.toBeInTheDocument();
    });

    it('con la misma versión que el backend, pide el consentimiento normal', async () => {
      renderGuarded({
        status: 200,
        body: { ...PACIENTE, legalAccepted: false, legalVersion: LEGAL_VERSION },
      });

      expect(
        await screen.findByRole('heading', { name: /necesitamos tu consentimiento/i }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: /actualizamos los términos/i }),
      ).not.toBeInTheDocument();
    });

    it('al aceptar registra la versión y muestra la app', async () => {
      const user = userEvent.setup();
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
        const aceptando = String(input).includes('/me/legal-acceptance');
        const body =
          aceptando || init?.method === 'POST'
            ? { ...PACIENTE, legalAccepted: true }
            : { ...PACIENTE, legalAccepted: false };
        return Promise.resolve(
          new Response(JSON.stringify(body), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      });
      const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={['/privado']}>
            <Routes>
              <Route
                path="/privado"
                element={
                  <RequireAuth>
                    <div>CONTENIDO PRIVADO</div>
                  </RequireAuth>
                }
              />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );

      // Sin marcar la casilla no manda nada.
      await user.click(await screen.findByRole('button', { name: /aceptar y continuar/i }));
      expect(
        await screen.findByText(/consentimiento para el tratamiento/i, { selector: 'p' }),
      ).toBeInTheDocument();

      await user.click(screen.getByRole('checkbox', { name: /leí y acepto/i }));
      await user.click(screen.getByRole('button', { name: /aceptar y continuar/i }));

      expect(await screen.findByText('CONTENIDO PRIVADO')).toBeInTheDocument();
      const aceptacion = fetchSpy.mock.calls.find(([input]) =>
        String(input).includes('/me/legal-acceptance'),
      );
      expect(JSON.parse(String(aceptacion?.[1]?.body))).toEqual({ version: LEGAL_VERSION });
    });
  });
});
