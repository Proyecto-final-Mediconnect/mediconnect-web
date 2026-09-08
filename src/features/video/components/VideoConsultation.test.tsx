// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { VideoConsultation } from './VideoConsultation';

const APPOINTMENT = '44444444-4444-4444-8444-444444444444';

const SESSION = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'paciente@test.com',
  role: 'PACIENTE',
  firstName: 'Juan',
  lastName: 'Paciente',
};

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

/**
 * La pantalla lee tres cosas: la sesión, la lista de turnos (para saber si la
 * ventana de ingreso está abierta) y el acceso a la sala. Se responden por URL:
 * con una sola respuesta para todo, `/appointments/me` contestaba un objeto donde
 * el componente espera una lista.
 *
 * La lista va vacía por defecto a propósito. Sin el turno en la lista el
 * componente no se pone a decidir sobre la ventana y deja que mande el backend,
 * que es lo que verifican los tests de abajo.
 */
describe('VideoConsultation', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  /** Turnos que devuelve `/appointments/me`. Los tests que necesitan uno lo ponen. */
  let turnos: unknown[] = [];

  function mockVideo(respuesta: () => Response) {
    fetchSpy.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/appointments/me')) return Promise.resolve(jsonResponse(turnos));
      if (url.includes('/video')) return Promise.resolve(respuesta());
      return Promise.resolve(jsonResponse(SESSION));
    });
  }

  beforeEach(() => {
    turnos = [];
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    mockVideo(() => jsonResponse(ACCESS));
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

    // Se cuentan solo las llamadas al endpoint de la sala: la pantalla también
    // pide la sesión y los turnos, y esas no crean nada en Daily.
    const alaSala = fetchSpy.mock.calls.filter(([url]: unknown[]) =>
      String(url).includes('/video'),
    );

    expect(alaSala).toHaveLength(1);
    expect(String(alaSala[0][0])).toContain(`/appointments/${APPOINTMENT}/video`);
    expect((alaSala[0][1] as RequestInit).method).toBe('POST');
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
    mockVideo(() =>
      jsonResponse({ ...ACCESS, recording: { enabled: true, mode: 'cloud-audio-only' } }),
    );

    renderComponent();

    expect(await screen.findByText(/Se está grabando el audio/i)).toBeInTheDocument();
  });

  it('muestra el mensaje del backend cuando todavía no es la hora', async () => {
    // El error de negocio es la explicación correcta para el usuario: no hay que
    // reemplazarlo por un "algo salió mal".
    mockVideo(() =>
      jsonResponse({ message: 'La sala se abre 10 minutos antes del turno.' }, 409),
    );

    renderComponent();

    expect(
      await screen.findByText('La sala se abre 10 minutos antes del turno.'),
    ).toBeInTheDocument();
    expect(screen.queryByTitle(/Videoconsulta/)).not.toBeInTheDocument();
  });

  it('permite reintentar después de un error', async () => {
    let primera = true;
    mockVideo(() => {
      if (primera) {
        primera = false;
        return jsonResponse({ message: 'Se cayó Daily.' }, 502);
      }
      return jsonResponse(ACCESS);
    });

    renderComponent();
    await screen.findByText('Se cayó Daily.');

    await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));

    await waitFor(() =>
      expect(screen.getByTitle(/Videoconsulta con Ana Gómez/)).toBeInTheDocument(),
    );
  });

  it('sigue funcionando si la contraparte no tiene perfil cargado', async () => {
    mockVideo(() => jsonResponse({ ...ACCESS, counterpart: null }));

    renderComponent();

    expect(await screen.findByTitle(/Videoconsulta con tu profesional/)).toBeInTheDocument();
  });

  it('al paciente no le muestra la ficha clínica ni el cierre', async () => {
    // El panel del canvas se llama "Info de la paciente" y existe para que el
    // médico tenga las alergias a la vista. Al paciente no le aporta nada y le
    // comería la mitad del video.
    renderComponent();
    await screen.findByTitle(/Videoconsulta con Ana Gómez/);

    expect(screen.queryByText(/info de la paciente/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /finalizar y ver el resumen/i }),
    ).not.toBeInTheDocument();
  });

  it('cuenta el tiempo en consulta desde que se abre la sala', async () => {
    renderComponent();

    const cronometro = await screen.findByRole('timer');
    expect(cronometro).toHaveTextContent(/^\d{2}:\d{2}$/);
  });

  describe('como profesional', () => {
    beforeEach(() => {
      mockVideo(() => jsonResponse({ ...ACCESS, role: 'PROFESIONAL' }));
      renderComponent();
    });

    it('muestra la ficha de la paciente con las alergias', async () => {
      expect(await screen.findByText(/info de la paciente/i)).toBeInTheDocument();
      expect(screen.getByText(/alergias/i)).toBeInTheDocument();
    });

    it('el botón de pausar la transcripción está apagado porque no hace nada', async () => {
      // Un botón que responde al click sin efecto es peor que uno apagado.
      await screen.findByText(/transcripción en vivo/i);

      expect(screen.getByRole('button', { name: /pausar/i })).toBeDisabled();
    });

    it('finalizar lleva al resumen, y se puede volver a la consulta', async () => {
      const user = userEvent.setup();
      await screen.findByTitle(/Videoconsulta con Ana Gómez/);

      await user.click(screen.getByRole('button', { name: /finalizar y ver el resumen/i }));

      expect(await screen.findByText(/consulta finalizada/i)).toBeInTheDocument();
      // El iframe se desmonta: la llamada no sigue detrás del resumen.
      expect(screen.queryByTitle(/Videoconsulta con Ana Gómez/)).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /volver a la consulta/i }));

      expect(await screen.findByTitle(/Videoconsulta con Ana Gómez/)).toBeInTheDocument();
    });

    it('el resumen se puede editar antes de firmar', async () => {
      const user = userEvent.setup();
      await screen.findByTitle(/Videoconsulta con Ana Gómez/);
      await user.click(screen.getByRole('button', { name: /finalizar y ver el resumen/i }));

      await user.click(await screen.findByRole('button', { name: /^editar$/i }));

      const campo = screen.getByRole('textbox', { name: /resumen de la consulta/i });
      await user.clear(campo);
      await user.type(campo, 'Control sin novedades.');

      await user.click(screen.getByRole('button', { name: /^listo$/i }));

      expect(screen.getByText('Control sin novedades.')).toBeInTheDocument();
    });

    it('firmar avisa que TODAVÍA no se incorporó a la historia clínica', async () => {
      // Firmar es un acto médico irreversible. El backend no tiene endpoint, así
      // que la pantalla no puede dar por hecho algo que no pasó.
      const user = userEvent.setup();
      await screen.findByTitle(/Videoconsulta con Ana Gómez/);
      await user.click(screen.getByRole('button', { name: /finalizar y ver el resumen/i }));

      await user.click(
        await screen.findByRole('button', { name: /firmar e incorporar a la historia/i }),
      );

      expect(await screen.findByRole('status')).toHaveTextContent(
        /todavía no se incorporó a la historia clínica/i,
      );
    });

    it('la transcripción completa se despliega a pedido', async () => {
      const user = userEvent.setup();
      await screen.findByTitle(/Videoconsulta con Ana Gómez/);
      await user.click(screen.getByRole('button', { name: /finalizar y ver el resumen/i }));

      const ver = await screen.findByRole('button', { name: /ver transcripción/i });
      expect(ver).toHaveAttribute('aria-expanded', 'false');

      await user.click(ver);

      expect(
        screen.getByRole('button', { name: /ocultar transcripción/i }),
      ).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('sala de espera', () => {
    /** Turno de las 10:00 (13:00 UTC) del 20/08/2026, 30 minutos. */
    const TURNO = {
      id: APPOINTMENT,
      scheduledAt: '2026-08-20T13:00:00Z',
      date: '2026-08-20',
      startTime: '10:00',
      durationMinutes: 30,
      price: 12000,
      currency: 'ARS',
      status: 'CONFIRMADO',
      professional: { id: 'p1', firstName: 'Ana', lastName: 'Gómez' },
      patient: { id: SESSION.id, firstName: 'Juan', lastName: 'Paciente' },
    };

    function reloj(iso: string) {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(new Date(iso));
    }

    afterEach(() => {
      vi.useRealTimers();
    });

    it('llegar temprano NO pide la sala: espera en vez de dar error', async () => {
      // Antes la pantalla llamaba al endpoint apenas se montaba y el backend
      // contestaba 409. Crear salas en Daily se factura por minuto.
      reloj('2026-08-20T12:30:00Z'); // faltan 20 min para el turno
      turnos = [TURNO];

      renderComponent();

      expect(await screen.findByText(/sala de espera/i)).toBeVisible();
      expect(
        fetchSpy.mock.calls.filter(([u]: unknown[]) => String(u).includes('/video')),
      ).toHaveLength(0);
    });

    it('muestra la cuenta regresiva cuando falta menos de una hora', async () => {
      reloj('2026-08-20T12:30:00Z'); // la sala abre 12:50 → faltan 20:00
      turnos = [TURNO];

      renderComponent();

      expect(await screen.findByRole('timer')).toHaveTextContent('20:00');
    });

    it('si falta mucho no cuenta segundos: dice cuándo es', async () => {
      reloj('2026-08-18T13:00:00Z'); // dos días antes
      turnos = [TURNO];

      renderComponent();

      expect(await screen.findByText(/tu consulta es el/i)).toBeVisible();
      expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    });

    it('al abrirse la ventana entra sola, sin recargar', async () => {
      // Es el punto de la sala de espera: quien llegó temprano y dejó la pestaña
      // abierta no tiene que estar mirando un botón.
      reloj('2026-08-20T12:49:30Z'); // faltan 30 segundos
      turnos = [TURNO];

      renderComponent();
      await screen.findByText(/sala de espera/i);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(31_000);
      });

      expect(await screen.findByTitle(/Videoconsulta con Ana Gómez/)).toBeInTheDocument();
    });

    it('un turno que ya terminó lo dice, en vez de intentar entrar', async () => {
      reloj('2026-08-20T15:00:00Z'); // dos horas después
      turnos = [TURNO];

      renderComponent();

      expect(await screen.findByText(/ya terminó/i)).toBeVisible();
      expect(
        fetchSpy.mock.calls.filter(([u]: unknown[]) => String(u).includes('/video')),
      ).toHaveLength(0);
    });

    it('un turno cancelado no abre ninguna sala', async () => {
      reloj('2026-08-20T12:55:00Z'); // dentro de la ventana
      turnos = [{ ...TURNO, status: 'CANCELADO' }];

      renderComponent();

      expect(await screen.findByText(/no tiene videoconsulta/i)).toBeVisible();
    });

    it('si el turno no está en la lista, decide el backend', async () => {
      // La lista está paginada: no aparecer ahí no puede significar "no entrás".
      reloj('2026-08-20T12:30:00Z');
      turnos = [];

      renderComponent();

      expect(await screen.findByTitle(/Videoconsulta con Ana Gómez/)).toBeInTheDocument();
    });
  });
});
