// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IpsMediPass } from './IpsMediPass';
import type { IpsResumen } from '../lib/ipsImport';
import type { PatientProfile } from '../types/patientProfile';

/** ENG-246 — sumar al MediPass lo que trae el resumen de salud. */

const PERFIL: PatientProfile = {
  profileId: 'p-1',
  firstName: 'Julián',
  lastName: 'Sosa',
  birthDate: '1994-03-18',
  dni: '30111222',
  phone: '+54 351 555 0000',
  completed: true,
  sex: null,
  bloodType: null,
  allergies: null,
  medications: null,
  conditions: null,
  emergencyContact: null,
};

const RESUMEN: IpsResumen = {
  documento: { titulo: 'Resumen', fecha: null },
  propuesta: {
    allergies: [{ que: 'Látex' }],
    medications: [],
    conditions: [],
  },
  vacunas: [],
  ignorados: [],
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('IpsMediPass (ENG-246)', () => {
  it('si el guardado falla, lo dice y deja reintentar', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) =>
      Promise.resolve(
        init?.method === 'PUT'
          ? json({ message: 'No pudimos guardar tus datos de emergencia.' }, 500)
          : json(PERFIL),
      ),
    );
    const onDone = vi.fn();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(['patient', 'me'], PERFIL);
    render(
      <QueryClientProvider client={client}>
        <IpsMediPass resumen={RESUMEN} onDone={onDone} onCancel={() => undefined} />
      </QueryClientProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Sumar 1 dato a mi MediPass' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos guardar tus datos de emergencia.',
    );
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Sumar 1 dato a mi MediPass' })).toBeEnabled();
  });
});
