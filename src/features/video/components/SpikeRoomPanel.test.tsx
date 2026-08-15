// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SpikeRoomPanel } from './SpikeRoomPanel';

const ROOM = {
  name: 'spike-eng51-a1b2c3d4',
  url: 'https://mediconnect.daily.co/spike-eng51-a1b2c3d4',
  expiresAt: '2026-08-15T18:40:00.000Z',
  professionalUrl: 'https://mediconnect.daily.co/spike-eng51-a1b2c3d4?t=pro',
  patientUrl: 'https://mediconnect.daily.co/spike-eng51-a1b2c3d4?t=pac',
  maxParticipants: 2,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Enruta por método + path, que es como el panel usa la API. */
function mockApi(handlers: { post?: () => Response; get?: () => Response; del?: () => Response }) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input, init): Promise<Response> => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (method === 'POST') {
      return Promise.resolve(handlers.post?.() ?? jsonResponse(ROOM, 201));
    }
    if (method === 'DELETE') {
      return Promise.resolve(handlers.del?.() ?? new Response(null, { status: 204 }));
    }
    if (url.endsWith('/sessions')) {
      return Promise.resolve(handlers.get?.() ?? jsonResponse([]));
    }
    return Promise.resolve(jsonResponse({}, 404));
  });
}

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SpikeRoomPanel />
    </QueryClientProvider>,
  );
}

describe('SpikeRoomPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(cleanup);

  it('crea la sala y embebe el Prebuilt con la URL del profesional', async () => {
    mockApi({});
    renderPanel();

    await userEvent.click(screen.getByRole('button', { name: /crear sala de prueba/i }));

    await waitFor(() => {
      expect(screen.getByText(ROOM.name)).toBeInTheDocument();
    });

    // El iframe entra como profesional (token con is_owner); el paciente tiene
    // su propio link para abrir en otra pestaña y poder medir dos participantes.
    expect(screen.getByTitle(/rol profesional/i)).toHaveAttribute('src', ROOM.professionalUrl);
    expect(screen.getByRole('link', { name: /entrar como paciente/i })).toHaveAttribute(
      'href',
      ROOM.patientUrl,
    );
  });

  it('explica que todavía no hay datos cuando la llamada sigue en curso', async () => {
    mockApi({ get: () => jsonResponse([]) });
    renderPanel();

    await userEvent.click(screen.getByRole('button', { name: /crear sala de prueba/i }));
    await screen.findByText(ROOM.name);

    await userEvent.click(screen.getByRole('button', { name: /ver métricas de la sesión/i }));

    // Daily publica la sesión recién al terminar: una lista vacía no es un error.
    expect(await screen.findByText(/todavía no hay sesiones cerradas/i)).toBeInTheDocument();
  });

  it('muestra la duración y los minutos de participante de la sesión', async () => {
    mockApi({
      get: () =>
        jsonResponse([
          {
            id: 's1',
            room: ROOM.name,
            startTime: '2026-08-15T18:00:00.000Z',
            durationSeconds: 1800,
            participants: 2,
            participantMinutes: 59,
          },
        ]),
    });
    renderPanel();

    await userEvent.click(screen.getByRole('button', { name: /crear sala de prueba/i }));
    await screen.findByText(ROOM.name);
    await userEvent.click(screen.getByRole('button', { name: /ver métricas de la sesión/i }));

    expect(await screen.findByText('30 min')).toBeInTheDocument();
    expect(screen.getByText('59')).toBeInTheDocument();
  });

  it('muestra el mensaje del backend cuando falta DAILY_API_KEY', async () => {
    mockApi({
      post: () =>
        jsonResponse(
          {
            message:
              'La integración con Daily.co no está configurada en este entorno (falta DAILY_API_KEY).',
          },
          503,
        ),
    });
    renderPanel();

    await userEvent.click(screen.getByRole('button', { name: /crear sala de prueba/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/falta DAILY_API_KEY/i);
  });

  it('al borrar la sala vuelve al estado inicial', async () => {
    mockApi({});
    renderPanel();

    await userEvent.click(screen.getByRole('button', { name: /crear sala de prueba/i }));
    await screen.findByText(ROOM.name);

    await userEvent.click(screen.getByRole('button', { name: /borrar sala/i }));

    await waitFor(() => {
      expect(screen.queryByText(ROOM.name)).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /crear sala de prueba/i })).toBeInTheDocument();
  });
});
