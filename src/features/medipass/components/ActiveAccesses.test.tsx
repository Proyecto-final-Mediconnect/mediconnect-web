// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActiveAccesses } from './ActiveAccesses';
import type { MediPassActiveAccess } from '../types/medipass';

/** ENG-74 / ENG-75 — quién mira el MediPass ahora, y cortarlo desde la web. */

const enMinutos = (m: number) => new Date(Date.now() + m * 60_000).toISOString();

const OCAMPO: MediPassActiveAccess = {
  id: '11111111-1111-4111-8111-111111111111',
  consultante: 'Dra. Valeria Ocampo',
  matricula: 'MP 45120',
  desde: enMinutos(-6),
  expiraEl: enMinutos(24),
  minutosRestantes: 24,
};

const GUARDIA: MediPassActiveAccess = {
  id: '22222222-2222-4222-8222-222222222222',
  consultante: 'Guardia Hospital Italiano',
  matricula: null,
  desde: enMinutos(-27),
  expiraEl: enMinutos(3),
  minutosRestantes: 3,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Un backend falso con la lista en memoria: revocar la saca, como el real. */
function renderAccesses(inicial: MediPassActiveAccess[], { fallaRevocar = false } = {}) {
  let accesos = [...inicial];
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    if (init?.method === 'DELETE') {
      if (fallaRevocar) return Promise.resolve(json({ message: 'Se cayó todo' }, 500));
      accesos = accesos.filter((a) => !url.endsWith(a.id));
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return Promise.resolve(json(accesos));
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ActiveAccesses />
    </QueryClientProvider>,
  );
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ActiveAccesses', () => {
  it('lista quién está mirando, con la matrícula si la dio', async () => {
    renderAccesses([OCAMPO, GUARDIA]);

    expect(await screen.findByText('Dra. Valeria Ocampo')).toBeInTheDocument();
    expect(screen.getByText(/Matrícula MP 45120/)).toBeInTheDocument();
    expect(screen.getByText('Guardia Hospital Italiano')).toBeInTheDocument();
    expect(screen.getAllByText(/Se corta solo en \d\d:\d\d/)).toHaveLength(2);
  });

  it('sin accesos abiertos lo dice', async () => {
    renderAccesses([]);

    expect(await screen.findByText(/nadie está mirando tu medipass/i)).toBeInTheDocument();
  });

  it('revocar pide confirmación, llama al DELETE y saca el acceso de la lista', async () => {
    const fetchMock = renderAccesses([OCAMPO, GUARDIA]);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Revocar el acceso de Dra. Valeria Ocampo' }),
    );
    const dialogo = screen.getByRole('dialog');
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Revocar acceso' }));

    expect(
      fetchMock.mock.calls.some(
        ([url, init]) => init?.method === 'DELETE' && String(url).endsWith(OCAMPO.id),
      ),
    ).toBe(true);
    await screen.findByText('Guardia Hospital Italiano');
    expect(
      await screen.findByRole('button', { name: /Revocar el acceso de Guardia/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Dra. Valeria Ocampo')).not.toBeInTheDocument();
  });

  it('si el corte falla, lo dice y el acceso sigue', async () => {
    renderAccesses([OCAMPO], { fallaRevocar: true });

    await userEvent.click(
      await screen.findByRole('button', { name: 'Revocar el acceso de Dra. Valeria Ocampo' }),
    );
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Revocar acceso' }),
    );

    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toBeInTheDocument();
    expect(screen.getAllByText('Dra. Valeria Ocampo').length).toBeGreaterThan(0);
  });
});
