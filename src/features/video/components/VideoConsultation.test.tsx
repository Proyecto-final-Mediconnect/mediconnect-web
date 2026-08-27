// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { VideoConsultation } from './VideoConsultation';

const APPOINTMENT = '44444444-4444-4444-8444-444444444444';

const ACCESS = {
  appointmentId: APPOINTMENT,
  role: 'PACIENTE' as const,
  roomUrl: 'https://mediconnect.daily.co/consulta-abc123?t=tok',
  expiresAt: '2026-08-27T15:45:00.000Z',
  counterpart: { firstName: 'Ana', lastName: 'Gómez' },
  recording: { enabled: false, mode: 'off' as const },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderComponent() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <VideoConsultation appointmentId={APPOINTMENT} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('VideoConsultation', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(jsonResponse(ACCESS)));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('pide la sala una sola vez al montarse', async () => {
    // Cada llamada puede crear una sala en Daily, que se factura por minuto de
    // participante. Montar la pantalla no puede crear dos.
    renderComponent();

    await screen.findByTitle(/Videoconsulta con Ana Gómez/);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toContain(`/appointments/${APPOINTMENT}/video`);
    expect((init as RequestInit).method).toBe('POST');
  });

  it('embebe el Prebuilt con la URL tokenizada', async () => {
    renderComponent();

    const frame = await screen.findByTitle(/Videoconsulta con Ana Gómez/);
    expect(frame).toHaveAttribute('src', ACCESS.roomUrl);
  });

  it('delega cámara y micrófono al iframe', async () => {
    // Un iframe cross-origin no hereda estos permisos: sin `allow`, el Prebuilt
    // carga y recién falla al pedir los dispositivos.
    renderComponent();

    const frame = await screen.findByTitle(/Videoconsulta con Ana Gómez/);
    expect(frame.getAttribute('allow')).toContain('camera');
    expect(frame.getAttribute('allow')).toContain('microphone');
  });

  it('avisa que la consulta NO se está grabando', async () => {
    // El aviso se muestra siempre, diga lo que diga: que no se grabe también es
    // información que el paciente tiene derecho a tener antes de hablar.
    renderComponent();

    expect(await screen.findByText(/no se está grabando/i)).toBeInTheDocument();
  });

  it('avisa cuando el audio sí se graba', async () => {
    fetchSpy.mockImplementation(() =>
      Promise.resolve(
        jsonResponse({
          ...ACCESS,
          recording: { enabled: true, mode: 'cloud-audio-only' },
        }),
      ),
    );

    renderComponent();

    expect(await screen.findByText(/Se está grabando el audio/i)).toBeInTheDocument();
  });

  it('muestra el mensaje del backend cuando todavía no es la hora', async () => {
    // El error de negocio es la explicación correcta para el usuario: no hay que
    // reemplazarlo por un "algo salió mal".
    fetchSpy.mockImplementation(() =>
      Promise.resolve(
        jsonResponse({ message: 'La sala se abre 10 minutos antes del turno.' }, 409),
      ),
    );

    renderComponent();

    expect(
      await screen.findByText('La sala se abre 10 minutos antes del turno.'),
    ).toBeInTheDocument();
    expect(screen.queryByTitle(/Videoconsulta/)).not.toBeInTheDocument();
  });

  it('permite reintentar después de un error', async () => {
    fetchSpy.mockImplementationOnce(() =>
      Promise.resolve(jsonResponse({ message: 'Se cayó Daily.' }, 502)),
    );

    renderComponent();
    await screen.findByText('Se cayó Daily.');

    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));

    await waitFor(() =>
      expect(screen.getByTitle(/Videoconsulta con Ana Gómez/)).toBeInTheDocument(),
    );
  });

  it('sigue funcionando si la contraparte no tiene perfil cargado', async () => {
    fetchSpy.mockImplementation(() =>
      Promise.resolve(jsonResponse({ ...ACCESS, counterpart: null })),
    );

    renderComponent();

    expect(await screen.findByTitle(/Videoconsulta con tu profesional/)).toBeInTheDocument();
  });
});
