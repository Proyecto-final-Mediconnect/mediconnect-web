// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PrivacyPage } from './PrivacyPage';
import { RequireAuth } from '../features/auth/components/RequireAuth';
import { SESSION_QUERY_KEY } from '../features/auth/hooks/useSession';
import type { SessionUser } from '../features/auth/types/session';

/** ENG-86 — los derechos ARCO desde la web. */

const PACIENTE = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'marina@test.com',
  role: 'PACIENTE',
  firstName: 'Marina',
  lastName: 'Ocampo',
  legalAccepted: true,
} as unknown as SessionUser;

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

type Opciones = { user?: SessionUser; fallaBaja?: boolean };

function renderPage({ user = PACIENTE, fallaBaja = false }: Opciones = {}) {
  let recordatorios = true;
  const llamadas: { metodo: string; ruta: string; body?: unknown }[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const ruta = String(input).replace(/^.*?(\/me|\/auth)/, '$1');
    const metodo = init?.method ?? 'GET';
    llamadas.push({ metodo, ruta, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (ruta === '/me/preferences' && metodo === 'GET')
      return Promise.resolve(json({ recordatoriosPorEmail: recordatorios }));
    if (ruta === '/me/preferences' && metodo === 'PUT') {
      recordatorios = (JSON.parse(String(init?.body)) as { recordatoriosPorEmail: boolean })
        .recordatoriosPorEmail;
      return Promise.resolve(json({ recordatoriosPorEmail: recordatorios }));
    }
    if (ruta === '/me/data-export')
      return Promise.resolve(
        json({ cuenta: { email: 'marina@test.com' } }, 200, {
          'Content-Disposition': 'attachment; filename="mediconnect-mis-datos-2026-11-04.json"',
        }),
      );
    if (ruta === '/me' && metodo === 'DELETE')
      return Promise.resolve(
        fallaBaja
          ? json(
              { message: 'Tenés un turno pendiente. Cancelalo antes de dar de baja la cuenta.' },
              409,
            )
          : new Response(null, { status: 204 }),
      );
    if (ruta === '/auth/logout') return Promise.resolve(new Response(null, { status: 204 }));
    return Promise.resolve(json([]));
  });

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(SESSION_QUERY_KEY, user);
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/privacidad']}>
        <Routes>
          <Route
            path="/privacidad"
            element={
              <RequireAuth skipLegal>
                <PrivacyPage />
              </RequireAuth>
            }
          />
          <Route path="/ingresar" element={<p>Pantalla de ingreso</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { llamadas, client };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PrivacyPage (ENG-86)', () => {
  it('muestra los cuatro derechos a un paciente', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Descargar tus datos' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Corregir tus datos' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Recordatorios por email' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Dar de baja tu cuenta' })).toBeVisible();
    expect(screen.getByText(/10 años desde la última atención/)).toBeVisible();
  });

  it('a un profesional no le ofrece recordatorios, que son del paciente', () => {
    renderPage({ user: { ...PACIENTE, role: 'PROFESIONAL' } as SessionUser });

    expect(screen.queryByRole('heading', { name: 'Recordatorios por email' })).toBeNull();
    expect(screen.getByText('Tu perfil público y tu agenda')).toBeVisible();
  });

  it('se puede entrar aunque no haya aceptado los términos vigentes', () => {
    renderPage({ user: { ...PACIENTE, legalAccepted: false } as SessionUser });

    expect(screen.getByRole('heading', { name: 'Descargar tus datos' })).toBeVisible();
  });

  it('descarga el archivo con el nombre que propone el backend', async () => {
    const user = userEvent.setup();
    const crear = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    const revocar = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Descargar mis datos' }));

    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe(
      'mediconnect-mis-datos-2026-11-04.json',
    );
    expect(crear).toHaveBeenCalled();
    // Los datos no quedan colgados en memoria del navegador.
    expect(revocar).toHaveBeenCalledWith('blob:x');
  });

  it('apaga los recordatorios', async () => {
    const user = userEvent.setup();
    const { llamadas } = renderPage();

    const interruptor = await screen.findByRole('switch', {
      name: 'Recibir recordatorios por email',
    });
    await waitFor(() => expect(interruptor).toBeChecked());
    await user.click(interruptor);

    await waitFor(() => expect(interruptor).not.toBeChecked());
    expect(llamadas).toContainEqual({
      metodo: 'PUT',
      ruta: '/me/preferences',
      body: { recordatoriosPorEmail: false },
    });
  });

  it('la baja no se habilita hasta escribir la frase exacta', async () => {
    const user = userEvent.setup();
    const { llamadas } = renderPage();
    const boton = screen.getByRole('button', { name: 'Dar de baja mi cuenta' });

    expect(boton).toBeDisabled();
    await user.type(screen.getByLabelText(/Para confirmar/), 'eliminar mi cuenta');
    expect(boton).toBeDisabled();
    expect(llamadas.some((l) => l.metodo === 'DELETE')).toBe(false);
  });

  it('con la frase da de baja, cierra la sesión y lleva al ingreso', async () => {
    const user = userEvent.setup();
    const { llamadas, client } = renderPage();

    await user.type(screen.getByLabelText(/Para confirmar/), 'ELIMINAR MI CUENTA');
    await user.click(screen.getByRole('button', { name: 'Dar de baja mi cuenta' }));

    expect(await screen.findByText('Pantalla de ingreso')).toBeVisible();
    expect(llamadas).toContainEqual({
      metodo: 'DELETE',
      ruta: '/me',
      body: { confirmacion: 'ELIMINAR MI CUENTA' },
    });
    expect(client.getQueryData(SESSION_QUERY_KEY)).toBeNull();
  });

  it('si el backend no deja (turnos pendientes), lo dice y no cierra la sesión', async () => {
    const user = userEvent.setup();
    const { client } = renderPage({ fallaBaja: true });

    await user.type(screen.getByLabelText(/Para confirmar/), 'ELIMINAR MI CUENTA');
    await user.click(screen.getByRole('button', { name: 'Dar de baja mi cuenta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/turno pendiente/);
    expect(client.getQueryData(SESSION_QUERY_KEY)).not.toBeNull();
  });
});
