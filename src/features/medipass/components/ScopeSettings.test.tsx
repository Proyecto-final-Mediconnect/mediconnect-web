// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ScopeSettings } from './ScopeSettings';
import { VitalBlockCard } from './VitalBlockCard';
import { recortarPorScope } from '../lib/medipass';
import type { MediPassScope, VitalBlock } from '../types/medipass';

/** ENG-149 — el paciente elige qué ve un consultante externo. */

const TODO: MediPassScope = {
  grupoSanguineo: true,
  alergias: true,
  medicacion: true,
  condiciones: true,
  contacto: true,
};

const VITAL: VitalBlock = {
  nombre: 'Julián Sosa',
  edad: 32,
  grupoSanguineo: '0+',
  alergias: [{ que: 'Penicilina', gravedad: 'Anafilaxia' }],
  medicacion: [{ droga: 'Enalapril 10 mg', dosis: 'Una vez por día' }],
  condiciones: null,
  contacto: { nombre: 'Marina', vinculo: 'Hermana', telefono: '+54 351 555' },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderSettings({ fallaGuardar = false } = {}) {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => {
    if (init?.method === 'PUT') {
      return Promise.resolve(
        fallaGuardar ? json({ message: 'boom' }, 500) : json(JSON.parse(String(init.body))),
      );
    }
    return Promise.resolve(json(TODO));
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ScopeSettings vital={VITAL} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ScopeSettings (ENG-149)', () => {
  it('muestra un interruptor por bloque, todos prendidos por defecto', async () => {
    renderSettings();

    expect(await screen.findByRole('switch', { name: 'Alergias' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Medicación' })).toBeChecked();
  });

  it('apagar un bloque guarda el scope entero con PUT', async () => {
    const fetchMock = renderSettings();

    await userEvent.click(await screen.findByRole('switch', { name: 'Medicación' }));

    expect(screen.getByRole('switch', { name: 'Medicación' })).not.toBeChecked();
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(String(put?.[0])).toMatch(/\/medipass\/me\/scope$/);
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({ ...TODO, medicacion: false });
  });

  it('si falla, vuelve atrás y lo dice', async () => {
    renderSettings({ fallaGuardar: true });

    await userEvent.click(await screen.findByRole('switch', { name: 'Alergias' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no pudimos guardar el cambio/i);
    expect(screen.getByRole('switch', { name: 'Alergias' })).toBeChecked();
  });

  it('un bloque sin cargar no se puede apagar y lleva a completarlo', async () => {
    renderSettings();

    expect(await screen.findByRole('switch', { name: 'Condiciones' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Completar' })).toHaveAttribute(
      'href',
      '/perfil/paciente#emergencias',
    );
  });
});

describe('ficha recortada (ENG-149)', () => {
  it('un bloque oculto dice "not shared", nunca "no known allergies"', () => {
    render(<VitalBlockCard vital={recortarPorScope(VITAL, { ...TODO, alergias: false })} />);

    expect(screen.getByText('Not shared by the patient')).toBeInTheDocument();
    expect(screen.queryByText('No known allergies')).not.toBeInTheDocument();
    expect(screen.queryByText(/Penicilina/)).not.toBeInTheDocument();
  });
});
