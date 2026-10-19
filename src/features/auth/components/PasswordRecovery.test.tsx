// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { ResetPasswordPage } from '../../../pages/ResetPasswordPage';

function renderAt(ui: ReactNode, path = '/') {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="*" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Recuperar contraseña (ENG-142)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('ForgotPasswordForm', () => {
    it('no llama al backend con un email inválido', async () => {
      const user = userEvent.setup();
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      renderAt(<ForgotPasswordForm />);

      await user.type(screen.getByLabelText('Email'), 'no-es-email');
      await user.click(screen.getByRole('button', { name: /enviarme el enlace/i }));

      expect(await screen.findByText('El email no tiene un formato válido')).toBeInTheDocument();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('pide el enlace y muestra un mensaje que no revela si la cuenta existe', async () => {
      const user = userEvent.setup();
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(jsonResponse(200, { message: 'ok' }));
      renderAt(<ForgotPasswordForm />);

      await user.type(screen.getByLabelText('Email'), 'ana@test.com');
      await user.click(screen.getByRole('button', { name: /enviarme el enlace/i }));

      expect(await screen.findByRole('status')).toHaveTextContent(
        /Si hay una cuenta con ana@test.com/,
      );
      const [url, init] = fetchSpy.mock.calls[0];
      expect(String(url)).toMatch(/\/auth\/password\/forgot$/);
      expect(JSON.parse(String(init?.body))).toEqual({ email: 'ana@test.com' });
    });

    it('ante el límite de pedidos muestra un mensaje entendible', async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        jsonResponse(429, { message: 'ThrottlerException: Too Many Requests' }),
      );
      renderAt(<ForgotPasswordForm />);

      await user.type(screen.getByLabelText('Email'), 'ana@test.com');
      await user.click(screen.getByRole('button', { name: /enviarme el enlace/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/Esperá un minuto/);
    });
  });

  describe('ResetPasswordPage', () => {
    const LINK = '/restablecer-contrasena?token_hash=abc123&type=recovery';

    it('sin token en el enlace no muestra el formulario y ofrece pedir otro', () => {
      renderAt(<ResetPasswordPage />, '/restablecer-contrasena');

      expect(screen.getByText('Este enlace no sirve')).toBeInTheDocument();
      expect(screen.queryByLabelText('Contraseña nueva')).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: /pedir un enlace nuevo/i })).toHaveAttribute(
        'href',
        '/recuperar-contrasena',
      );
    });

    it('valida las reglas de la contraseña antes de llamar al backend', async () => {
      const user = userEvent.setup();
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      renderAt(<ResetPasswordPage />, LINK);

      await user.type(screen.getByLabelText('Contraseña nueva'), 'debil');
      await user.type(screen.getByLabelText('Confirmar contraseña'), 'debil');
      await user.click(screen.getByRole('button', { name: /guardar contraseña/i }));

      expect(
        await screen.findByText('La contraseña debe tener al menos 8 caracteres'),
      ).toBeInTheDocument();
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('manda el token del enlace con la contraseña nueva y confirma el cambio', async () => {
      const user = userEvent.setup();
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(jsonResponse(200, { message: 'ok' }));
      renderAt(<ResetPasswordPage />, LINK);

      await user.type(screen.getByLabelText('Contraseña nueva'), 'NuevaClave1');
      await user.type(screen.getByLabelText('Confirmar contraseña'), 'NuevaClave1');
      await user.click(screen.getByRole('button', { name: /guardar contraseña/i }));

      expect(await screen.findByRole('status')).toHaveTextContent('Cambiaste tu contraseña');
      const [url, init] = fetchSpy.mock.calls[0];
      expect(String(url)).toMatch(/\/auth\/password\/reset$/);
      expect(JSON.parse(String(init?.body))).toEqual({
        tokenHash: 'abc123',
        password: 'NuevaClave1',
        passwordConfirmation: 'NuevaClave1',
      });
    });

    it('con un enlace vencido muestra el error del backend y ofrece pedir otro', async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        jsonResponse(400, {
          message:
            'El enlace para restablecer la contraseña no es válido o ya venció. Pedí uno nuevo.',
        }),
      );
      renderAt(<ResetPasswordPage />, LINK);

      await user.type(screen.getByLabelText('Contraseña nueva'), 'NuevaClave1');
      await user.type(screen.getByLabelText('Confirmar contraseña'), 'NuevaClave1');
      await user.click(screen.getByRole('button', { name: /guardar contraseña/i }));

      const alerta = await screen.findByRole('alert');
      expect(alerta).toHaveTextContent(/ya venció/);
      expect(screen.getByRole('link', { name: /pedir un enlace nuevo/i })).toBeInTheDocument();
    });

    it('si el servicio no responde, deja reintentar sin ofrecer un enlace nuevo', async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        jsonResponse(503, {
          message: 'No pudimos conectar con el servicio. Probá de nuevo en unos minutos.',
        }),
      );
      renderAt(<ResetPasswordPage />, LINK);

      await user.type(screen.getByLabelText('Contraseña nueva'), 'NuevaClave1');
      await user.type(screen.getByLabelText('Confirmar contraseña'), 'NuevaClave1');
      await user.click(screen.getByRole('button', { name: /guardar contraseña/i }));

      expect(await screen.findByRole('alert')).toHaveTextContent(/no pudimos conectar/i);
      expect(
        screen.queryByRole('link', { name: /pedir un enlace nuevo/i }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /guardar contraseña/i })).toBeEnabled();
    });

    it('si el enlace ya se gastó, no deja reintentar y lleva a pedir otro', async () => {
      const user = userEvent.setup();
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        jsonResponse(400, {
          message:
            'La contraseña nueva tiene que ser distinta de la anterior. Por seguridad, este enlace ya no sirve: pedí uno nuevo.',
          code: 'RECOVERY_LINK_CONSUMED',
        }),
      );
      renderAt(<ResetPasswordPage />, LINK);

      await user.type(screen.getByLabelText('Contraseña nueva'), 'NuevaClave1');
      await user.type(screen.getByLabelText('Confirmar contraseña'), 'NuevaClave1');
      await user.click(screen.getByRole('button', { name: /guardar contraseña/i }));

      expect(await screen.findByText('Este enlace ya se usó')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(/distinta de la anterior/);
      expect(screen.queryByLabelText('Contraseña nueva')).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: /pedir un enlace nuevo/i })).toHaveAttribute(
        'href',
        '/recuperar-contrasena',
      );
    });

    it('borra el token de la dirección y no manda Referer mientras está abierta', () => {
      window.history.pushState(null, '', LINK);
      const { unmount } = renderAt(<ResetPasswordPage />, LINK);

      expect(window.location.search).toBe('');
      expect(screen.getByLabelText('Contraseña nueva')).toBeInTheDocument();
      expect(document.querySelector('meta[name="referrer"]')).toHaveAttribute(
        'content',
        'no-referrer',
      );

      unmount();
      expect(document.querySelector('meta[name="referrer"]')).toBeNull();
      window.history.pushState(null, '', '/');
    });
  });
});
