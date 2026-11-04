// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EmergencyCard } from './EmergencyCard';
import type { EmergencyCardStatus } from '../types/medipass';

/** ENG-176 — la tarjeta de emergencia: generarla, imprimirla, regenerarla y desactivarla. */

const TOKEN = 'Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Un backend falso con el estado de la tarjeta en memoria, como el real. */
function renderCard(inicial: EmergencyCardStatus, { fallaCrear = false } = {}) {
  let estado = { ...inicial };
  const llamadas: string[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const metodo = init?.method ?? 'GET';
    llamadas.push(`${metodo} ${String(input).replace(/^.*\/medipass/, '/medipass')}`);
    if (metodo === 'POST') {
      if (fallaCrear) return Promise.resolve(json({ message: 'Se cayó todo' }, 500));
      estado = { activa: true, creadaEl: '2026-11-04T15:00:00.000Z' };
      return Promise.resolve(json({ tarjeta: TOKEN, creadaEl: estado.creadaEl }, 201));
    }
    if (metodo === 'DELETE') {
      estado = { activa: false, creadaEl: null };
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return Promise.resolve(json(estado));
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <EmergencyCard nombre="Marina Ocampo" />
    </QueryClientProvider>,
  );
  return llamadas;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('EmergencyCard (ENG-176)', () => {
  it('sin tarjeta, explica para qué sirve y ofrece generarla', async () => {
    renderCard({ activa: false, creadaEl: null });

    expect(await screen.findByRole('button', { name: 'Generar mi tarjeta' })).toBeVisible();
    expect(screen.getByText(/aunque no puedas mostrar el código/)).toBeVisible();
  });

  it('al generarla muestra el QR para imprimir, con el token en el fragmento', async () => {
    const user = userEvent.setup();
    renderCard({ activa: false, creadaEl: null });

    await user.click(await screen.findByRole('button', { name: 'Generar mi tarjeta' }));

    const tarjeta = await screen.findByLabelText('Tarjeta de emergencia para imprimir');
    expect(within(tarjeta).getByText('Marina Ocampo')).toBeVisible();
    expect(within(tarjeta).getByText('Emergencia médica')).toBeVisible();
    expect(screen.getByText(/no la vamos a volver a mostrar/)).toBeVisible();
    // El token no aparece como texto: solo dentro del QR.
    expect(screen.queryByText(new RegExp(TOKEN))).not.toBeInTheDocument();
  });

  it('Imprimir abre el diálogo de impresión del navegador', async () => {
    const user = userEvent.setup();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderCard({ activa: false, creadaEl: null });

    await user.click(await screen.findByRole('button', { name: 'Generar mi tarjeta' }));
    await user.click(await screen.findByRole('button', { name: 'Imprimir' }));

    expect(print).toHaveBeenCalledTimes(1);
  });

  it('después de "Listo", el QR desaparece y queda solo que hay una activa', async () => {
    const user = userEvent.setup();
    renderCard({ activa: false, creadaEl: null });

    await user.click(await screen.findByRole('button', { name: 'Generar mi tarjeta' }));
    await user.click(await screen.findByRole('button', { name: 'Listo, ya la guardé' }));

    expect(screen.queryByLabelText('Tarjeta de emergencia para imprimir')).not.toBeInTheDocument();
    expect(await screen.findByText(/Tenés una tarjeta activa/)).toBeVisible();
    expect(screen.getByText('Activa')).toBeVisible();
  });

  it('con una activa, regenerar pide confirmación y avisa que la anterior deja de andar', async () => {
    const user = userEvent.setup();
    const llamadas = renderCard({ activa: true, creadaEl: '2026-10-01T12:00:00.000Z' });

    await user.click(await screen.findByRole('button', { name: 'Generar una nueva' }));
    const dialogo = screen.getByRole('dialog');
    expect(within(dialogo).getByText(/deja de funcionar en este momento/)).toBeVisible();
    expect(llamadas.filter((l) => l.startsWith('POST'))).toHaveLength(0);

    await user.click(within(dialogo).getByRole('button', { name: 'Generar una nueva' }));

    expect(await screen.findByLabelText('Tarjeta de emergencia para imprimir')).toBeVisible();
    expect(llamadas).toContain('POST /medipass/me/emergency-card');
  });

  it('desactivar pide confirmación y la desactiva', async () => {
    const user = userEvent.setup();
    const llamadas = renderCard({ activa: true, creadaEl: '2026-10-01T12:00:00.000Z' });

    await user.click(await screen.findByRole('button', { name: 'Desactivar' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Desactivar' }),
    );

    expect(await screen.findByRole('button', { name: 'Generar mi tarjeta' })).toBeVisible();
    expect(llamadas).toContain('DELETE /medipass/me/emergency-card');
  });

  it('si falla la generación, lo dice y no muestra ninguna tarjeta', async () => {
    const user = userEvent.setup();
    renderCard({ activa: false, creadaEl: null }, { fallaCrear: true });

    await user.click(await screen.findByRole('button', { name: 'Generar mi tarjeta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Se cayó todo');
    expect(screen.queryByLabelText('Tarjeta de emergencia para imprimir')).not.toBeInTheDocument();
  });
});
