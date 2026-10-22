// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AccessHistory } from './AccessHistory';
import type { MediPassAccess, MediPassHistory } from '../types/medipass';

/** ENG-76 — el historial de accesos al MediPass, visto por el paciente. */

const MARTIN: MediPassAccess = {
  sesionId: 's-1',
  consultante: { nombre: 'Martín Olivares', matricula: 'MP-33871' },
  inicio: '2026-10-18T14:00:00.000Z',
  vence: '2026-10-18T14:30:00.000Z',
  revocadoEl: null,
  estado: 'VENCIDO',
  vistas: [
    { recurso: 'alergias', etiqueta: 'Alergias', el: '2026-10-18T14:01:00.000Z' },
    {
      recurso: 'medicacion_activa',
      etiqueta: 'Medicación activa',
      el: '2026-10-18T14:02:00.000Z',
    },
  ],
};

const GUARDIA: MediPassAccess = {
  sesionId: 's-2',
  consultante: { nombre: 'Guardia — Hospital Privado', matricula: null },
  inicio: '2026-10-12T10:00:00.000Z',
  vence: '2026-10-12T10:30:00.000Z',
  revocadoEl: '2026-10-12T10:12:00.000Z',
  estado: 'REVOCADO',
  vistas: [],
};

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Responde cada página por su número; sin página pedida, la 1. */
function renderHistory(pages: Record<number, MediPassHistory>) {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const pagina = Number(new URL(String(input)).searchParams.get('pagina') ?? '1');
    return Promise.resolve(json(pages[pagina]));
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AccessHistory />
    </QueryClientProvider>,
  );
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('AccessHistory', () => {
  it('muestra quién entró, con qué matrícula, cuándo y qué miró', async () => {
    renderHistory({ 1: { accesos: [MARTIN], pagina: 1, hayMas: false } });

    expect(await screen.findByText('Martín Olivares')).toBeVisible();
    expect(screen.getByText(/Matrícula MP-33871/)).toBeVisible();
    expect(screen.getByText('Cerrado')).toBeVisible();

    const vistas = screen.getByRole('list', { name: 'Lo que vio Martín Olivares' });
    expect(within(vistas).getByText('Alergias')).toBeVisible();
    expect(within(vistas).getByText('Medicación activa')).toBeVisible();
    // Hora de Argentina: 14:01 UTC son las 11:01.
    expect(within(vistas).getByText('11:01')).toBeVisible();
  });

  it('un acceso que el paciente cortó lo dice, y dice a qué hora', async () => {
    renderHistory({ 1: { accesos: [GUARDIA], pagina: 1, hayMas: false } });

    expect(await screen.findByText('Lo cortaste vos')).toBeVisible();
    expect(screen.getByText('No dio matrícula', { exact: false })).toBeVisible();
    expect(screen.getByText('Cortaste el acceso a las 07:12.')).toBeVisible();
  });

  it('sin accesos lo explica en vez de quedar en blanco', async () => {
    renderHistory({ 1: { accesos: [], pagina: 1, hayMas: false } });

    expect(await screen.findByText('Nadie abrió tu MediPass todavía.')).toBeVisible();
  });

  it('pagina hacia los accesos anteriores y vuelve', async () => {
    const user = userEvent.setup();
    const fetchMock = renderHistory({
      1: { accesos: [MARTIN], pagina: 1, hayMas: true },
      2: { accesos: [GUARDIA], pagina: 2, hayMas: false },
    });

    await screen.findByText('Martín Olivares');
    await user.click(screen.getByRole('button', { name: 'Anteriores →' }));

    expect(await screen.findByText('Guardia — Hospital Privado')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/medipass/me/historial?pagina=2'),
      expect.anything(),
    );
    expect(screen.getByRole('button', { name: 'Anteriores →' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: '← Más recientes' }));
    expect(await screen.findByText('Martín Olivares')).toBeVisible();
  });

  it('con una sola página no muestra la paginación', async () => {
    renderHistory({ 1: { accesos: [MARTIN], pagina: 1, hayMas: false } });

    await screen.findByText('Martín Olivares');
    expect(screen.queryByRole('navigation', { name: 'Páginas del historial' })).toBeNull();
  });
});
