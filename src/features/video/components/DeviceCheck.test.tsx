// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeviceCheck } from './DeviceCheck';

const SALA = {
  url: 'https://mediconnect.daily.co/prueba-0123456789ab?t=tok',
  expiraEl: '2026-11-04T18:10:00.000Z',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderDeviceCheck() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DeviceCheck />
    </QueryClientProvider>,
  );
}

/** "Probar cámara y micrófono": una sala de Daily solo para quien la pide. */
describe('DeviceCheck', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(SALA, 201));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('no pide ninguna sala hasta que se toca el botón: cada una se factura', () => {
    renderDeviceCheck();

    expect(screen.getByRole('button', { name: /Probar cámara y micrófono/ })).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('al tocarlo crea la sala y la abre con cámara y micrófono delegados', async () => {
    renderDeviceCheck();

    await userEvent.click(screen.getByRole('button', { name: /Probar cámara y micrófono/ }));

    const frame = await screen.findByTitle('Prueba de cámara y micrófono');
    expect(frame).toHaveAttribute('src', SALA.url);
    expect(frame.getAttribute('allow')).toContain('camera');
    expect(frame.getAttribute('allow')).toContain('microphone');
    expect(screen.getByText(/Esta sala es solo tuya/)).toBeInTheDocument();

    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/video/test-room');
    expect(init.method).toBe('POST');
  });

  it('al cerrar sale de la llamada: el iframe deja de existir', async () => {
    renderDeviceCheck();
    await userEvent.click(screen.getByRole('button', { name: /Probar cámara y micrófono/ }));
    await screen.findByTitle('Prueba de cámara y micrófono');

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(screen.queryByTitle('Prueba de cámara y micrófono')).not.toBeInTheDocument();
  });

  it('si no se puede crear la sala, lo dice con el mensaje del backend', async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse(
        {
          message:
            'La integración con Daily.co no está configurada en este entorno (falta DAILY_API_KEY).',
        },
        503,
      ),
    );
    renderDeviceCheck();

    await userEvent.click(screen.getByRole('button', { name: /Probar cámara y micrófono/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no está configurada/);
    expect(screen.queryByTitle('Prueba de cámara y micrófono')).not.toBeInTheDocument();
  });
});
