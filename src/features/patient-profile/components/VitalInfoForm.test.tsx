// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { VitalInfoForm } from './VitalInfoForm';
import type { PatientProfile } from '../types/patientProfile';

/** ENG-136 — el paciente carga los datos que ve un médico en su MediPass. */

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
  allergies: [{ que: 'Penicilina', gravedad: 'Anafilaxia' }],
  medications: null,
  conditions: null,
  emergencyContact: null,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderForm(
  respuesta: (body: unknown) => Response = (body) => json({ ...PERFIL, ...(body as object) }),
) {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => {
    if (init?.method === 'PUT') return Promise.resolve(respuesta(JSON.parse(String(init.body))));
    return Promise.resolve(json(PERFIL));
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['patient', 'me'], PERFIL);
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <VitalInfoForm />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return fetchMock;
}

const enviado = (fetchMock: ReturnType<typeof renderForm>) => {
  const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
  return put ? JSON.parse(String(put[1]?.body)) : undefined;
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('VitalInfoForm (ENG-136)', () => {
  it('precarga lo que ya estaba guardado', () => {
    renderForm();

    expect(screen.getByDisplayValue('Penicilina')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Anafilaxia')).toBeInTheDocument();
    // Sin cambios no hay nada que guardar.
    expect(screen.getByRole('button', { name: /guardar datos de emergencia/i })).toBeDisabled();
  });

  it('guarda el grupo sanguíneo, un remedio y el contacto con PUT /patients/me/vital', async () => {
    const fetchMock = renderForm();

    await userEvent.click(screen.getByRole('radio', { name: '0+' }));
    await userEvent.click(screen.getByRole('button', { name: /agregar remedio/i }));
    await userEvent.type(screen.getByPlaceholderText('Enalapril 10 mg'), 'Apixabán 5 mg');
    await userEvent.type(screen.getByPlaceholderText('Marina Sosa'), 'Marina Sosa');
    await userEvent.type(screen.getByPlaceholderText('+54 351 555 2210'), '+54 351 555 2210');
    await userEvent.click(screen.getByRole('button', { name: /guardar datos de emergencia/i }));

    expect(await screen.findByText(/ya se ve en tu medipass/i)).toBeInTheDocument();
    const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(String(put?.[0])).toMatch(/\/patients\/me\/vital$/);
    expect(enviado(fetchMock)).toMatchObject({
      bloodType: '0+',
      allergies: [{ que: 'Penicilina', gravedad: 'Anafilaxia' }],
      medications: [{ droga: 'Apixabán 5 mg' }],
      emergencyContact: { nombre: 'Marina Sosa', telefono: '+54 351 555 2210' },
    });
  });

  it('quitar una alergia y guardar la borra', async () => {
    const fetchMock = renderForm();

    await userEvent.click(screen.getByRole('button', { name: 'Quitar la alergia 1' }));
    await userEvent.click(screen.getByRole('button', { name: /guardar datos de emergencia/i }));

    await screen.findByText(/ya se ve en tu medipass/i);
    expect(enviado(fetchMock).allergies).toBeUndefined();
  });

  it('marca el campo que falta y no manda nada', async () => {
    const fetchMock = renderForm();

    await userEvent.type(screen.getByPlaceholderText('Hermana'), 'Hermana');
    await userEvent.click(screen.getByRole('button', { name: /guardar datos de emergencia/i }));

    expect(screen.getByText('Falta el nombre del contacto')).toBeInTheDocument();
    expect(screen.getByText('Falta el teléfono')).toBeInTheDocument();
    expect(enviado(fetchMock)).toBeUndefined();
  });

  it('si el backend lo rechaza, muestra su mensaje', async () => {
    renderForm(() => json({ message: 'El grupo sanguíneo tiene que ser 0, A, B o AB' }, 400));

    await userEvent.click(screen.getByRole('radio', { name: 'AB-' }));
    await userEvent.click(screen.getByRole('button', { name: /guardar datos de emergencia/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/grupo sanguíneo/i);
  });
});
