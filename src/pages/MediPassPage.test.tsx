// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { MediPassPage } from './MediPassPage';
import { MOCK_VITAL_BLOCK } from '../features/medipass/lib/mockMediPass';

/**
 * El MediPass del paciente con la API (ENG-135): el código y el bloque vital
 * salen del backend, y el QR lleva a la vista de emergencia con el código.
 */

const SESION = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'paciente@test.com',
  role: 'PACIENTE',
  firstName: 'Julián',
  lastName: 'Sosa',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderPage(
  codigo: Response = json({
    codigo: 'AB12CD34',
    expiraEl: new Date(Date.now() + 4 * 60_000).toISOString(),
  }),
) {
  const pedidos: string[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input);
    pedidos.push(url);
    if (url.endsWith('/medipass/me')) return Promise.resolve(codigo.clone());
    if (url.endsWith('/medipass/me/vital')) return Promise.resolve(json(MOCK_VITAL_BLOCK));
    return Promise.resolve(json(SESION));
  });

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <MediPassPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return pedidos;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('MediPassPage (ENG-135)', () => {
  it('muestra el código vigente del backend, de a cuatro', async () => {
    renderPage();

    expect(await screen.findByText('AB12-CD34')).toBeVisible();
    expect(screen.getByRole('timer')).toHaveTextContent(/se renueva en 0[34]:\d\d/i);
  });

  // Es lo que hace funcionar la jornada: el médico escanea con la cámara.
  it('el QR abre la vista de emergencia con el código cargado', async () => {
    renderPage();

    const qr = await screen.findByRole('img', { name: 'Código QR del MediPass' });
    expect(qr).toHaveAttribute(
      'data-qr-value',
      `${window.location.origin}/medipass/emergencia?codigo=AB12CD34`,
    );
  });

  it('muestra el bloque vital tal como lo lee quien escanea', async () => {
    renderPage();

    expect(await screen.findByText(MOCK_VITAL_BLOCK.nombre)).toBeVisible();
    expect(screen.getByText('Allergies')).toBeVisible();
  });

  it('si no puede generar el código lo dice y ofrece reintentar', async () => {
    renderPage(json({ message: 'No pudimos cargar tu código MediPass.' }, 500));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar tu código MediPass.',
    );
    expect(screen.getByRole('button', { name: 'Probá de nuevo' })).toBeVisible();
  });
});
