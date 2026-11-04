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
const AHORA = Date.parse('2026-11-04T18:00:00.000Z');
const MINUTO = 60_000;

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
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => jsonResponse(SALA, 201));
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
    fetchSpy.mockImplementation(async () =>
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

  it('un segundo clic reusa la sala mientras no haya vencido: no factura otra', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(AHORA);
    renderDeviceCheck();

    await userEvent.click(screen.getByRole('button', { name: /Probar cámara y micrófono/ }));
    await screen.findByTitle('Prueba de cámara y micrófono');
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

    await userEvent.click(screen.getByRole('button', { name: /Probar cámara y micrófono/ }));

    expect(await screen.findByTitle('Prueba de cámara y micrófono')).toHaveAttribute(
      'src',
      SALA.url,
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('si la sala reusada ya venció, pide una nueva', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(AHORA);
    renderDeviceCheck();

    await userEvent.click(screen.getByRole('button', { name: /Probar cámara y micrófono/ }));
    await screen.findByTitle('Prueba de cámara y micrófono');
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

    vi.spyOn(Date, 'now').mockReturnValue(AHORA + 11 * MINUTO);
    await userEvent.click(screen.getByRole('button', { name: /Probar cámara y micrófono/ }));

    await screen.findByTitle('Prueba de cámara y micrófono');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['http (sin TLS)', 'http://mediconnect.daily.co/prueba?t=tok'],
    ['host que no es de Daily', 'https://evil.example.com/prueba?t=tok'],
    ['dominio que solo empieza igual', 'https://daily.co.evil.example.com/prueba?t=tok'],
    ['javascript:', 'javascript:alert(1)'],
  ])('no abre la URL si no es https de daily.co (%s)', async (_, urlInvalida) => {
    fetchSpy.mockImplementation(async () => jsonResponse({ ...SALA, url: urlInvalida }, 201));
    renderDeviceCheck();

    await userEvent.click(screen.getByRole('button', { name: /Probar cámara y micrófono/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no es válida/);
    expect(screen.queryByTitle('Prueba de cámara y micrófono')).not.toBeInTheDocument();
  });
});
