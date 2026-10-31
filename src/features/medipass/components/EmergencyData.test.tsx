// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { EmergencyData } from './EmergencyData';
import { VitalBlockCard } from './VitalBlockCard';
import { recortarPorScope } from '../lib/medipass';
import type { MediPassScope, VitalBlock } from '../types/medipass';

/** ENG-136 y ENG-149 — los datos de emergencia: qué se ve y editarlos sin salir del MediPass. */

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

const PERFIL = {
  profileId: 'p-1',
  firstName: 'Julián',
  lastName: 'Sosa',
  birthDate: '1994-03-18',
  dni: '30111222',
  phone: null,
  completed: true,
  sex: null,
  bloodType: '0+',
  allergies: [{ que: 'Penicilina', gravedad: 'Anafilaxia' }],
  medications: [{ droga: 'Enalapril 10 mg', dosis: 'Una vez por día' }],
  conditions: null,
  emergencyContact: { nombre: 'Marina', vinculo: 'Hermana', telefono: '+54 351 555' },
};

function renderData({ fallaGuardar = false } = {}) {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    if (url.endsWith('/patients/me/vital')) {
      return Promise.resolve(json({ ...PERFIL, ...JSON.parse(String(init?.body)) }));
    }
    if (url.endsWith('/patients/me')) return Promise.resolve(json(PERFIL));
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
        <EmergencyData vital={VITAL} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('EmergencyData', () => {
  it('muestra lo cargado de cada bloque', async () => {
    renderData();

    expect(await screen.findByText('Penicilina')).toBeVisible();
    expect(screen.getByText('Enalapril 10 mg')).toBeVisible();
    expect(screen.getByText('Marina')).toBeVisible();
  });

  it('muestra un interruptor por bloque, todos prendidos por defecto', async () => {
    renderData();

    expect(await screen.findByRole('switch', { name: 'Alergias' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Medicación' })).toBeChecked();
  });

  it('apagar un bloque guarda el scope entero con PUT', async () => {
    const fetchMock = renderData();

    await userEvent.click(await screen.findByRole('switch', { name: 'Medicación' }));

    expect(screen.getByRole('switch', { name: 'Medicación' })).not.toBeChecked();
    expect(screen.getByText('Oculto al escanear')).toBeVisible();
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(String(put?.[0])).toMatch(/\/medipass\/me\/scope$/);
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({ ...TODO, medicacion: false });
  });

  it('si falla, vuelve atrás y lo dice', async () => {
    renderData({ fallaGuardar: true });

    await userEvent.click(await screen.findByRole('switch', { name: 'Alergias' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no pudimos guardar el cambio/i);
    expect(screen.getByRole('switch', { name: 'Alergias' })).toBeChecked();
  });

  it('un bloque sin cargar no se puede apagar y se agrega desde ahí', async () => {
    renderData();

    expect(await screen.findByRole('switch', { name: 'Condiciones' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Agregar condiciones' })).toBeVisible();
  });

  it('editar un bloque abre el panel, guarda y lo cierra', async () => {
    const fetchMock = renderData();

    await userEvent.click(await screen.findByRole('button', { name: 'Editar alergias' }));
    const panel = await screen.findByRole('dialog', { name: 'Alergias' });
    expect(await within(panel).findByDisplayValue('Penicilina')).toBeVisible();

    await userEvent.click(within(panel).getByRole('button', { name: /agregar otra alergia/i }));
    await userEvent.type(within(panel).getAllByPlaceholderText('Penicilina')[1], 'Látex');
    await userEvent.click(within(panel).getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByRole('status')).toHaveTextContent(/ya se ve en tu medipass/i);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const put = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith('/patients/me/vital'),
    );
    expect(JSON.parse(String(put?.[1]?.body)).allergies).toEqual([
      { que: 'Penicilina', gravedad: 'Anafilaxia' },
      { que: 'Látex' },
    ]);
  });

  it('la vista previa muestra la ficha en inglés que lee el médico', async () => {
    renderData();

    await userEvent.click(await screen.findByRole('button', { name: /ver como lo ve un médico/i }));

    const panel = await screen.findByRole('dialog', { name: 'Lo que ve un médico' });
    expect(within(panel).getByText('Allergies')).toBeVisible();
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
