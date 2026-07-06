// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { RegisterForm } from './RegisterForm';

function renderForm() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <RegisterForm />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renderiza los campos y el botón', () => {
    renderForm();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar contraseña')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /crear cuenta/i }),
    ).toBeInTheDocument();
  });

  it('muestra errores de validación y no llama al backend con datos inválidos', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    renderForm();

    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

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

    await user.type(screen.getByLabelText('Email'), 'user@test.com');
    await user.type(screen.getByLabelText('Contraseña'), 'Password1');
    await user.type(
      screen.getByLabelText('Confirmar contraseña'),
      'Password1',
    );
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(await screen.findByText('Revisá tu correo')).toBeInTheDocument();
  });
});
