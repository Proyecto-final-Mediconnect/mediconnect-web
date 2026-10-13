// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { RegisterForm } from './RegisterForm';
import { LEGAL_VERSION } from '../../legal/legal';

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
    expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeInTheDocument();
  });

  it('muestra errores de validación y no llama al backend con datos inválidos', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    renderForm();

    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(await screen.findByText('El email no tiene un formato válido')).toBeInTheDocument();
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
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'Password1');
    await user.click(screen.getByRole('checkbox', { name: /leí y acepto/i }));
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(await screen.findByText('Revisá tu correo')).toBeInTheDocument();
    // Al backend va la versión de los textos, no el booleano del checkbox.
    const [, init] = vi.mocked(globalThis.fetch).mock.calls[0];
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body.acceptedLegalVersion).toBe(LEGAL_VERSION);
    expect(body).not.toHaveProperty('acceptedLegal');
  });

  it('no envía el registro sin aceptar los textos legales (ENG-140)', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    renderForm();

    await user.type(screen.getByLabelText('Email'), 'user@test.com');
    await user.type(screen.getByLabelText('Contraseña'), 'Password1');
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'Password1');
    await user.click(screen.getByRole('button', { name: /crear cuenta/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /consentimiento para el tratamiento/i,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('la casilla de consentimiento arranca sin marcar', () => {
    renderForm();
    expect(screen.getByRole('checkbox', { name: /leí y acepto/i })).not.toBeChecked();
  });
});
