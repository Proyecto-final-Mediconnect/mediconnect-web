// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from './AppShell';
import type { SessionUser } from '../../features/auth/types/session';

const PACIENTE: SessionUser = {
  id: 'u1',
  email: 'marina@test.com',
  role: 'PACIENTE',
  firstName: 'Marina',
  lastName: 'Sosa',
};

const PROFESIONAL: SessionUser = {
  id: 'u2',
  email: 'valeria@test.com',
  role: 'PROFESIONAL',
  firstName: 'Valeria',
  lastName: 'Ocampo',
};

function renderShell(user: SessionUser | null, ruta = '/paciente') {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(user ? JSON.stringify(user) : null, {
      status: user ? 200 : 401,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[ruta]}>
        <AppShell title="Panel">
          <p>contenido</p>
        </AppShell>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** El menú lateral, para afirmar sobre él sin tocar el resto de la pantalla. */
function menu() {
  return within(screen.getByRole('navigation'));
}

describe('AppShell', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('muestra el título de la sección y el contenido', async () => {
    renderShell(PACIENTE);

    expect(await screen.findByRole('heading', { name: 'Panel' })).toBeVisible();
    expect(screen.getByText('contenido')).toBeVisible();
  });

  it('al paciente le ofrece sus secciones', async () => {
    renderShell(PACIENTE);
    await screen.findByText('Marina Sosa');

    expect(menu().getByRole('link', { name: 'Mis turnos' })).toBeVisible();
    expect(menu().getByRole('link', { name: 'Buscar profesionales' })).toBeVisible();
    expect(menu().getByRole('link', { name: 'Mi perfil' })).toBeVisible();
  });

  it('al profesional le ofrece las suyas, que no son las mismas', async () => {
    renderShell(PROFESIONAL, '/profesional');
    await screen.findByText('Valeria Ocampo');

    expect(menu().getByRole('link', { name: 'Mi agenda' })).toBeVisible();
    expect(menu().getByRole('link', { name: 'Mis consultas' })).toBeVisible();
    // "Buscar profesionales" es del recorrido del paciente: un profesional no
    // reserva turnos con otros desde su panel.
    expect(menu().queryByRole('link', { name: 'Buscar profesionales' })).not.toBeInTheDocument();
  });

  it('marca la sección actual para lectores de pantalla', async () => {
    renderShell(PACIENTE, '/mis-turnos');
    await screen.findByText('Marina Sosa');

    expect(menu().getByRole('link', { name: 'Mis turnos' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(menu().getByRole('link', { name: 'Panel' })).not.toHaveAttribute('aria-current');
  });

  it('identifica a quién tiene la sesión abierta y con qué rol', async () => {
    renderShell(PROFESIONAL, '/profesional');

    expect(await screen.findByText('Valeria Ocampo')).toBeVisible();
    expect(screen.getByText('Profesional')).toBeVisible();
    expect(screen.getByText('VO')).toBeVisible();
  });

  it('ofrece cerrar sesión', async () => {
    renderShell(PACIENTE);
    await screen.findByText('Marina Sosa');

    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
  });

  it('sin sesión cargada no rompe: cae al menú de paciente', async () => {
    renderShell(null);

    // El guard es RequireAuth, no el shell. Acá solo importa que no explote
    // mientras la sesión todavía no resolvió.
    expect(await screen.findByRole('heading', { name: 'Panel' })).toBeVisible();
    expect(menu().getByRole('link', { name: 'Panel' })).toBeVisible();
  });
});
