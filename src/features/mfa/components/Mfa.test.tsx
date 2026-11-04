// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LoginForm } from '../../auth/components/LoginForm';
import { TwoStepVerification } from './TwoStepVerification';

/** Verificación en dos pasos (ENG-88): el ingreso con código y la activación. */

function json(body: unknown, status = 200): Response {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

type Responder = (url: string, init?: RequestInit) => Response;

function mockFetch(responder: Responder) {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    calls.push({
      method: init?.method ?? 'GET',
      url,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return Promise.resolve(responder(url, init));
  });
  return calls;
}

function renderUi(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/ingresar']}>
        <Routes>
          <Route path="/ingresar" element={ui} />
          <Route path="/paciente" element={<h1>Panel del paciente</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const ME = {
  id: 'u-1',
  email: 'ana@test.com',
  role: 'PACIENTE',
  firstName: 'Ana',
  lastName: 'García',
  legalAccepted: true,
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Ingreso con verificación en dos pasos', () => {
  async function ingresarConContrasena() {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Email'), 'ana@test.com');
    await user.type(screen.getByLabelText('Contraseña'), 'Password1');
    await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    return user;
  }

  it('sin la verificación activa, entra directo como siempre', async () => {
    mockFetch((url) =>
      url.endsWith('/auth/login') ? json({ user: { id: 'u-1', email: 'ana@test.com' } }) : json(ME),
    );
    renderUi(<LoginForm />);

    await ingresarConContrasena();

    expect(await screen.findByRole('heading', { name: 'Panel del paciente' })).toBeInTheDocument();
  });

  it('con la verificación activa pide el código y recién con él entra', async () => {
    const calls = mockFetch((url) => {
      if (url.endsWith('/auth/login')) {
        return json({ user: { id: 'u-1', email: 'ana@test.com' }, mfaRequired: true });
      }
      if (url.endsWith('/auth/mfa/verify')) return json({ user: { id: 'u-1' } });
      return json(ME);
    });
    renderUi(<LoginForm />);

    const user = await ingresarConContrasena();
    expect(
      await screen.findByRole('heading', { name: 'Verificación en dos pasos' }),
    ).toBeInTheDocument();
    expect(calls.some((c) => c.url.endsWith('/me'))).toBe(false);

    const campo = screen.getByLabelText('Código');
    await user.type(campo, '12 34-56');
    expect(campo).toHaveValue('123456');
    await user.click(screen.getByRole('button', { name: 'Verificar e ingresar' }));

    expect(await screen.findByRole('heading', { name: 'Panel del paciente' })).toBeInTheDocument();
    expect(calls).toContainEqual(
      expect.objectContaining({ method: 'POST', body: { code: '123456' } }),
    );
  });

  it('un código equivocado lo dice y deja reintentar', async () => {
    mockFetch((url) => {
      if (url.endsWith('/auth/login')) {
        return json({ user: { id: 'u-1', email: 'ana@test.com' }, mfaRequired: true });
      }
      return json({ message: 'El código no es válido o ya venció.' }, 400);
    });
    renderUi(<LoginForm />);

    const user = await ingresarConContrasena();
    await user.type(await screen.findByLabelText('Código'), '000000');
    await user.click(screen.getByRole('button', { name: 'Verificar e ingresar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El código no es válido o ya venció.',
    );
    expect(screen.getByLabelText('Código')).toHaveValue('000000');
  });
});

describe('Activar y desactivar la verificación en dos pasos', () => {
  it('activa: muestra el QR y la clave, y queda activa con el primer código', async () => {
    let activa = false;
    const calls = mockFetch((url) => {
      if (url.endsWith('/me/mfa/enroll')) {
        return json({ factorId: 'f-1', qr: 'data:image/svg+xml;utf-8,<svg/>', secret: 'JBSWY3DP' });
      }
      if (url.endsWith('/me/mfa/enroll/verify')) {
        activa = true;
        return json({ activa: true });
      }
      return json({ activa });
    });
    renderUi(<TwoStepVerification />);
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole('button', { name: 'Activar verificación en dos pasos' }),
    );
    expect(await screen.findByAltText('Código QR para la app autenticadora')).toHaveAttribute(
      'src',
      'data:image/svg+xml;utf-8,<svg/>',
    );
    expect(screen.getByText('JBSWY3DP')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Código de la app'), '123456');
    await user.click(screen.getByRole('button', { name: 'Activar' }));

    expect(await screen.findByText('Activa')).toBeInTheDocument();
    expect(calls).toContainEqual(
      expect.objectContaining({ body: { factorId: 'f-1', code: '123456' } }),
    );
  });

  it('desactivar pide un código de la app', async () => {
    let activa = true;
    const calls = mockFetch((url) => {
      if (url.endsWith('/me/mfa/disable')) {
        activa = false;
        return new Response(null, { status: 204 });
      }
      return json({ activa });
    });
    renderUi(<TwoStepVerification />);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Desactivar' }));
    const enviar = screen.getByRole('button', { name: 'Desactivar' });
    expect(enviar).toBeDisabled();
    await user.type(screen.getByLabelText(/escribí el código de la app/), '654321');
    await user.click(enviar);

    await waitFor(() => expect(screen.getByText('Desactivada')).toBeInTheDocument());
    expect(calls).toContainEqual(
      expect.objectContaining({ method: 'POST', body: { code: '654321' } }),
    );
  });
});
