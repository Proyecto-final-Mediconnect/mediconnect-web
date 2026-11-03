// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VitalInfoForm, type VitalSection } from './VitalInfoForm';
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
  seccion: VitalSection,
  respuesta: (body: unknown) => Response = (body) => json({ ...PERFIL, ...(body as object) }),
) {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => {
    if (init?.method === 'PUT') return Promise.resolve(respuesta(JSON.parse(String(init.body))));
    return Promise.resolve(json(PERFIL));
  });
  const onDone = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['patient', 'me'], PERFIL);
  render(
    <QueryClientProvider client={client}>
      <VitalInfoForm seccion={seccion} onDone={onDone} />
    </QueryClientProvider>,
  );
  return { fetchMock, onDone };
}

const enviado = ({ fetchMock }: ReturnType<typeof renderForm>) => {
  const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
  return put ? JSON.parse(String(put[1]?.body)) : undefined;
};

const guardar = () => userEvent.click(screen.getByRole('button', { name: 'Guardar' }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('VitalInfoForm (ENG-136)', () => {
  it('precarga lo que ya estaba guardado', () => {
    renderForm('alergias');

    expect(screen.getByDisplayValue('Penicilina')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Anafilaxia')).toBeInTheDocument();
    // Sin cambios no hay nada que guardar.
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  // PUT reemplaza todo: editar un bloque no puede borrar los otros.
  it('guarda el bloque editado sin perder los demás, con PUT /patients/me/vital', async () => {
    const montado = renderForm('basicos');

    await userEvent.click(screen.getByRole('radio', { name: '0+' }));
    await guardar();

    await vi.waitFor(() => expect(montado.onDone).toHaveBeenCalledWith(true));
    const put = montado.fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
    expect(String(put?.[0])).toMatch(/\/patients\/me\/vital$/);
    expect(enviado(montado)).toMatchObject({
      bloodType: '0+',
      allergies: [{ que: 'Penicilina', gravedad: 'Anafilaxia' }],
    });
  });

  it('una lista vacía arranca con una fila para escribir', async () => {
    const montado = renderForm('medicacion');

    await userEvent.type(screen.getByPlaceholderText('Enalapril 10 mg'), 'Apixabán 5 mg');
    await guardar();

    await vi.waitFor(() => expect(montado.onDone).toHaveBeenCalledWith(true));
    expect(enviado(montado).medications).toEqual([{ droga: 'Apixabán 5 mg' }]);
  });

  it('quitar una alergia y guardar la borra', async () => {
    const montado = renderForm('alergias');

    await userEvent.click(screen.getByRole('button', { name: 'Quitar la alergia 1' }));
    await guardar();

    await vi.waitFor(() => expect(montado.onDone).toHaveBeenCalledWith(true));
    expect(enviado(montado).allergies).toBeUndefined();
  });

  it('marca el campo que falta y no manda nada', async () => {
    const montado = renderForm('contacto');

    await userEvent.type(screen.getByPlaceholderText('Hermana'), 'Hermana');
    await guardar();

    expect(screen.getByText('Falta el nombre del contacto')).toBeInTheDocument();
    expect(screen.getByText('Falta el teléfono')).toBeInTheDocument();
    expect(enviado(montado)).toBeUndefined();
  });

  it('cancelar no guarda nada', async () => {
    const montado = renderForm('basicos');

    await userEvent.click(screen.getByRole('radio', { name: 'AB+' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(montado.onDone).toHaveBeenCalledWith(false);
    expect(enviado(montado)).toBeUndefined();
  });

  it('si el backend lo rechaza, muestra su mensaje', async () => {
    const montado = renderForm('basicos', () =>
      json({ message: 'El grupo sanguíneo tiene que ser 0, A, B o AB' }, 400),
    );

    await userEvent.click(screen.getByRole('radio', { name: 'AB-' }));
    await guardar();

    expect(await screen.findByRole('alert')).toHaveTextContent(/grupo sanguíneo/i);
    expect(montado.onDone).not.toHaveBeenCalled();
  });
});
