// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PatientProfileForm } from './PatientProfileForm';

const COMPLETED_PROFILE = {
  profileId: 'user-1',
  firstName: 'Ana',
  lastName: 'Paciente',
  birthDate: '1990-05-20',
  dni: '12345678',
  phone: '+54 11 5555-5555',
  completed: true,
};

const EMPTY_PROFILE = {
  profileId: 'user-1',
  firstName: null,
  lastName: null,
  birthDate: null,
  dni: null,
  phone: null,
  completed: false,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Mockea GET /patients/me (devuelve `getProfile`) y PUT (devuelve `onSave`). */
function mockFetch(getProfile: unknown, onSave?: (body: unknown) => void) {
  vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => {
    if (init?.method === 'PUT') {
      onSave?.(JSON.parse(String(init.body)));
      return Promise.resolve(jsonResponse({ ...COMPLETED_PROFILE, completed: true }));
    }
    return Promise.resolve(jsonResponse(getProfile));
  });
}

function renderForm() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <PatientProfileForm />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('PatientProfileForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('precarga los datos de un perfil ya completo', async () => {
    mockFetch(COMPLETED_PROFILE);
    renderForm();
    expect(await screen.findByDisplayValue('Ana')).toBeInTheDocument();
    expect(screen.getByDisplayValue('12345678')).toBeInTheDocument();
  });

  it('muestra el aviso cuando el perfil no está completo', async () => {
    mockFetch(EMPTY_PROFILE);
    renderForm();
    expect(await screen.findByText(/todavía no completaste tu perfil/i)).toBeInTheDocument();
  });

  it('valida el DNI antes de enviar y no llama al backend', async () => {
    const onSave = vi.fn();
    mockFetch(EMPTY_PROFILE, onSave);
    const user = userEvent.setup();
    renderForm();

    await user.type(await screen.findByLabelText('Nombre'), 'Ana');
    await user.type(screen.getByLabelText('Apellido'), 'Paciente');
    await user.type(screen.getByLabelText('Fecha de nacimiento'), '1990-05-20');
    await user.type(screen.getByLabelText('DNI'), '123'); // inválido
    await user.type(screen.getByLabelText('Teléfono'), '1155555555');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByText(/el dni debe tener 7 u 8 dígitos/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('envía el perfil normalizado y muestra el confirmado', async () => {
    const onSave = vi.fn();
    mockFetch(EMPTY_PROFILE, onSave);
    const user = userEvent.setup();
    renderForm();

    await user.type(await screen.findByLabelText('Nombre'), 'Ana');
    await user.type(screen.getByLabelText('Apellido'), 'Paciente');
    await user.type(screen.getByLabelText('Fecha de nacimiento'), '1990-05-20');
    await user.type(screen.getByLabelText('DNI'), '12.345.678'); // con puntos
    await user.type(screen.getByLabelText('Teléfono'), '+54 11 5555-5555');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    // El DNI viaja normalizado (sin puntos) al backend.
    expect(onSave.mock.calls[0][0]).toMatchObject({ dni: '12345678' });
    expect(await screen.findByText(/perfil guardado/i)).toBeInTheDocument();
  });

  it('ante 401 (sesión vencida) no muestra el formulario: redirige al login', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ message: 'No autorizado' }, 401),
    );
    renderForm();

    // El guard de 401 devuelve <Navigate>, así que el form nunca se monta.
    await waitFor(() => expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument());
  });
});
