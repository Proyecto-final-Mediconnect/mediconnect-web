// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ProfessionalRegisterForm } from './ProfessionalRegisterForm';

function renderForm() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ProfessionalRegisterForm />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nombre'), 'Ana');
  await user.type(screen.getByLabelText('Apellido'), 'García');
  await user.type(screen.getByLabelText('Especialidad'), 'Cardiología');
  await user.type(screen.getByLabelText('Número de matrícula'), 'MP-12345');
  await user.type(screen.getByLabelText('Email'), 'pro@test.com');
  await user.type(screen.getByLabelText('Contraseña'), 'Password1');
  await user.type(screen.getByLabelText('Confirmar contraseña'), 'Password1');
}

describe('ProfessionalRegisterForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renderiza los campos profesionales y el botón', () => {
    renderForm();
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Apellido')).toBeInTheDocument();
    expect(screen.getByLabelText('Especialidad')).toBeInTheDocument();
    expect(screen.getByLabelText('Número de matrícula')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /crear cuenta profesional/i }),
    ).toBeInTheDocument();
  });

  it('no llama al backend con datos inválidos', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    renderForm();

    await user.click(
      screen.getByRole('button', { name: /crear cuenta profesional/i }),
    );

    expect(
      await screen.findByText('El email no tiene un formato válido'),
    ).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('envía datos válidos y muestra el estado de éxito', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          message: 'Registro iniciado. Revisá tu email para verificar tu cuenta.',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    renderForm();

    await fillValidForm(user);
    await user.click(
      screen.getByRole('button', { name: /crear cuenta profesional/i }),
    );

    expect(await screen.findByText('Revisá tu correo')).toBeInTheDocument();
  });
});
