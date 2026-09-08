// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';
import type { SessionUser } from '../../features/auth/types/session';

/**
 * La barra pública dejó de ser estática: muestra quién tiene la sesión abierta.
 *
 * El caso que motivó el cambio es el del profesional logueado navegando el
 * catálogo público. Antes leía "Ingresar / Crear cuenta", tocaba reservar y el
 * guard lo devolvía a su panel sin explicación. Nada en pantalla decía que había
 * una sesión, y menos de qué rol.
 */

function renderHeader(user: SessionUser | null) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
    Promise.resolve(
      user
        ? new Response(JSON.stringify(user), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        : new Response(null, { status: 401 }),
    ),
  );

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PublicHeader />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const profesional: SessionUser = {
  id: 'u-1',
  email: 'ana@test.test',
  role: 'PROFESIONAL',
  firstName: 'Ana',
  lastName: 'García',
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PublicHeader', () => {
  it('al visitante anónimo le ofrece ingresar y crear cuenta', async () => {
    renderHeader(null);

    expect(await screen.findByRole('link', { name: 'Ingresar' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Crear cuenta' })).toBeVisible();
  });

  it('con sesión muestra el nombre y el rol, y lleva al panel', async () => {
    renderHeader(profesional);

    const bloque = await screen.findByRole('link', { name: /Ana García/ });
    expect(bloque).toHaveAttribute('href', '/profesional');
    expect(bloque).toHaveTextContent('Profesional');
  });

  it('con sesión ya no ofrece ingresar ni crear cuenta', async () => {
    renderHeader(profesional);

    await screen.findByRole('link', { name: /Ana García/ });
    expect(screen.queryByRole('link', { name: 'Ingresar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Crear cuenta' })).not.toBeInTheDocument();
  });

  /**
   * El detalle que hace que el cambio no moleste: mientras `GET /me` viaja, la
   * barra no afirma nada. Mostrar "Ingresar" y cambiarlo 200 ms después le dice a
   * quien está logueado que no tiene sesión, aunque sea por un instante.
   */
  it('mientras resuelve la sesión no dice ni que hay ni que no hay', () => {
    // Una promesa que nunca resuelve deja el hook en `isLoading` para siempre.
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <PublicHeader />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.queryByRole('link', { name: 'Ingresar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Crear cuenta' })).not.toBeInTheDocument();
    // El catálogo sí está: no depende de quién mire.
    expect(screen.getByRole('link', { name: 'Buscar profesionales' })).toBeVisible();
  });

  it('el paciente ve su nombre igual, apuntando a su propio panel', async () => {
    renderHeader({ ...profesional, role: 'PACIENTE', firstName: 'Julián', lastName: 'Sosa' });

    const bloque = await screen.findByRole('link', { name: /Julián Sosa/ });
    expect(bloque).toHaveAttribute('href', '/paciente');
  });

  /** Entre el registro y el alta de la ficha el perfil no tiene nombre. El
   *  bloque no puede quedar vacío ni el avatar sin iniciales. */
  it('cae al email cuando el perfil todavía no tiene nombre', async () => {
    renderHeader({ ...profesional, firstName: null, lastName: null });

    await waitFor(() =>
      expect(screen.getByRole('link', { name: /ana@test.test/ })).toBeVisible(),
    );
  });
});
