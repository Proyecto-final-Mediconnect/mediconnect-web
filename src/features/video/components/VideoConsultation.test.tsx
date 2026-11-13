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

/** Toca "Finalizar" y confirma: antes de la hora de fin del turno se pide
 *  confirmación (review de #75), y estos tests corren en ese caso. */
async function finalizar(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /finalizar y ver el resumen/i }));
  await user.click(await screen.findByRole('button', { name: 'Sí, finalizar' }));
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
  /** Respuesta de `PATCH /appointments/:id/complete` (ENG-189). */
  let completar: () => Response = () => jsonResponse({ id: APPOINTMENT, status: 'COMPLETADO' });

  function mockVideo(respuesta: () => Response) {
    fetchSpy.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/appointments/me')) return Promise.resolve(jsonResponse(turnos));
      if (url.includes('/complete')) return Promise.resolve(completar());
      if (url.includes('/video')) return Promise.resolve(respuesta());
      return Promise.resolve(jsonResponse(SESSION));
    });
  }

  beforeEach(() => {
    turnos = [];
    completar = () => jsonResponse({ id: APPOINTMENT, status: 'COMPLETADO' });
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
    mockVideo(() => jsonResponse({ message: 'La sala se abre 10 minutos antes del turno.' }, 409));

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
    const PRO = '22222222-2222-4222-8222-222222222222';
    const PACIENTE = '33333333-3333-4333-8333-333333333333';
    const VITAL = {
      nombre: 'Ana Gómez',
      edad: 41,
      alergias: [{ que: 'Penicilina', gravedad: 'Anafilaxia' }],
      medicacion: [{ droga: 'Enalapril', dosis: '10 mg' }],
      condiciones: [{ nombre: 'Hipertensión', codigo: 'I10' }],
    };
    const ENTRADA = {
      id: 'e-1',
      patientId: PACIENTE,
      professionalId: PRO,
      professional: { firstName: 'Laura', lastName: 'Ríos' },
      sequenceNumber: 1,
      entryType: 'DIAGNOSTICO',
      fhirResourceType: 'ClinicalImpression',
      content: {},
      consultationId: null,
      correctsEntryId: null,
      createdAt: '2026-10-01T15:00:00.000Z',
      contentHash: 'h1',
      previousHash: 'h0',
    };
    let vital: () => Response;
    let historia: () => Response;
    let alta: ReturnType<typeof vi.fn<(init?: RequestInit) => Response>>;

    beforeEach(() => {
      vital = () => jsonResponse(VITAL);
      historia = () => jsonResponse([ENTRADA]);
      alta = vi.fn<(init?: RequestInit) => Response>(() => jsonResponse(ENTRADA, 201));
      // El turno está en la lista y la sala abierta: así se sabe quién es el
      // paciente, que es de quien se pide la ficha.
      turnos = [
        {
          id: APPOINTMENT,
          scheduledAt: new Date().toISOString(),
          date: new Date().toISOString().slice(0, 10),
          startTime: '10:00',
          durationMinutes: 30,
          price: 15000,
          currency: 'ARS',
          status: 'CONFIRMADO',
          professional: { id: PRO, firstName: 'Laura', lastName: 'Ríos' },
          patient: { id: PACIENTE, firstName: 'Ana', lastName: 'Gómez' },
        },
      ];
      fetchSpy.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/clinical-record/vital')) return Promise.resolve(vital());
        if (url.includes('/clinical-record'))
          return Promise.resolve(init?.method === 'POST' ? alta(init) : historia());
        if (url.includes('/appointments/me')) return Promise.resolve(jsonResponse(turnos));
        if (url.includes('/complete')) return Promise.resolve(completar());
        if (url.includes('/video'))
          return Promise.resolve(
            jsonResponse({ ...ACCESS, role: 'PROFESIONAL', consultationId: 'cons-1' }),
          );
        return Promise.resolve(jsonResponse({ ...SESSION, id: PRO, role: 'PROFESIONAL' }));
      });
    });

    it('muestra las alergias, la medicación y las condiciones reales del paciente (ENG-191)', async () => {
      renderComponent();

      expect(await screen.findByText(/penicilina · anafilaxia/i)).toBeInTheDocument();
      expect(screen.getByText(/enalapril 10 mg/i)).toBeInTheDocument();
      expect(screen.getByText('Hipertensión')).toBeInTheDocument();
      expect(screen.getByText(/41 años/)).toBeInTheDocument();
      expect(await screen.findByText('Diagnóstico')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Ver historia completa' })).toHaveAttribute(
        'href',
        `/pacientes/${PACIENTE}/historia-clinica`,
      );
    });

    it('ya no muestra transcripción ni consentimiento inventados', async () => {
      renderComponent();
      await screen.findByText(/penicilina/i);

      expect(screen.queryByText(/transcripción en vivo/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/consentimiento firmado/i)).not.toBeInTheDocument();
    });

    it('sin datos cargados muestra un estado vacío, no un error', async () => {
      vital = () => jsonResponse({ nombre: 'Ana Gómez', alergias: null, medicacion: null });
      renderComponent();

      expect(
        await screen.findByText('Este paciente todavía no cargó alergias ni medicación.'),
      ).toBeInTheDocument();
    });

    it('si la ficha no carga, la llamada sigue y se puede reintentar', async () => {
      vital = () => jsonResponse({ message: 'caído' }, 403);
      const user = userEvent.setup();
      renderComponent();

      expect(
        await screen.findByText('No pudimos cargar la ficha del paciente.'),
      ).toBeInTheDocument();
      expect(screen.getByTitle(/Videoconsulta con Ana Gómez/)).toBeInTheDocument();

      vital = () => jsonResponse(VITAL);
      await user.click(screen.getAllByRole('button', { name: 'Reintentar' })[0]);

      expect(await screen.findByText(/penicilina/i)).toBeInTheDocument();
    });

    it('finalizar cierra el turno y abre la evolución asociada a la consulta (ENG-189, ENG-191)', async () => {
      const user = userEvent.setup();
      renderComponent();
      await screen.findByTitle(/Videoconsulta con Ana Gómez/);

      await finalizar(user);

      expect(
        await screen.findByRole('heading', { name: 'Evolución de la consulta' }),
      ).toBeInTheDocument();
      const cierre = fetchSpy.mock.calls.find(([input]: [RequestInfo | URL]) =>
        String(input).includes(`/appointments/${APPOINTMENT}/complete`),
      );
      expect(cierre?.[1]).toEqual(expect.objectContaining({ method: 'PATCH' }));

      await user.type(screen.getByLabelText(/motivo de consulta/i), 'Control de presión');
      await user.click(screen.getByRole('button', { name: 'Guardar en la historia clínica' }));

      expect(await screen.findByText('Guardado en la historia clínica.')).toBeInTheDocument();
      const body = JSON.parse(String((alta.mock.calls[0][0] as RequestInit).body)) as Record<
        string,
        unknown
      >;
      expect(body).toMatchObject({
        entryType: 'CONSULTA',
        reason: 'Control de presión',
        consultationId: 'cons-1',
      });
    });

    it('si hay algo escrito, salir de la evolución pide confirmación (review de #77)', async () => {
      const user = userEvent.setup();
      renderComponent();
      await screen.findByTitle(/Videoconsulta con Ana Gómez/);
      await finalizar(user);

      await user.type(await screen.findByLabelText(/motivo de consulta/i), 'Control');
      await user.click(screen.getByRole('button', { name: 'Lo cargo después' }));

      expect(
        await screen.findByRole('heading', { name: '¿Salir sin guardar la evolución?' }),
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Seguir escribiendo' }));
      expect(screen.getByLabelText(/motivo de consulta/i)).toHaveValue('Control');
      expect(alta).not.toHaveBeenCalled();
    });

    it('la ficha no se vuelve a pedir al volver a la pestaña (cada lectura se audita)', async () => {
      renderComponent();
      await screen.findByText(/penicilina/i);
      const lecturas = () =>
        fetchSpy.mock.calls.filter(([input]: [RequestInfo | URL]) =>
          String(input).includes('/clinical-record/vital'),
        ).length;
      const antes = lecturas();

      window.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
      await new Promise((r) => setTimeout(r, 50));

      expect(lecturas()).toBe(antes);
    });

    it('"Lo cargo después" no crea ninguna entrada', async () => {
      const user = userEvent.setup();
      renderComponent();
      await screen.findByTitle(/Videoconsulta con Ana Gómez/);
      await finalizar(user);

      await user.click(await screen.findByRole('button', { name: 'Lo cargo después' }));

      expect(alta).not.toHaveBeenCalled();
    });

    it('después de finalizar sigue a la evolución aunque la lista ya diga COMPLETADO', async () => {
      // Bug real: al cerrar el turno se recarga la lista, el turno pasa a
      // COMPLETADO y la pantalla saltaba a "Este turno no tiene videoconsulta".
      completar = () => {
        turnos = turnos.map((t) => ({ ...(t as object), status: 'COMPLETADO' }));
        return jsonResponse({ id: APPOINTMENT, status: 'COMPLETADO' });
      };
      const user = userEvent.setup();
      renderComponent();
      await screen.findByTitle(/Videoconsulta con Ana Gómez/);

      await finalizar(user);

      expect(
        await screen.findByRole('heading', { name: 'Evolución de la consulta' }),
      ).toBeInTheDocument();
      expect(screen.queryByText(/no tiene videoconsulta/i)).not.toBeInTheDocument();
    });

    it('antes de la hora de fin pide confirmación, y "Seguir en la consulta" no cierra nada', async () => {
      const user = userEvent.setup();
      renderComponent();
      await screen.findByTitle(/Videoconsulta con Ana Gómez/);

      await user.click(screen.getByRole('button', { name: /finalizar y ver el resumen/i }));
      await user.click(await screen.findByRole('button', { name: 'Seguir en la consulta' }));

      expect(screen.getByTitle(/Videoconsulta con Ana Gómez/)).toBeInTheDocument();
      expect(
        fetchSpy.mock.calls.some(([input]: [RequestInfo | URL]) =>
          String(input).includes('/complete'),
        ),
      ).toBe(false);
    });

    it('si cerrar el turno falla, sigue en la llamada con el error y se puede reintentar', async () => {
      completar = () => jsonResponse({ message: 'Ese turno ya no se puede cerrar.' }, 409);
      const user = userEvent.setup();
      renderComponent();
      await screen.findByTitle(/Videoconsulta con Ana Gómez/);

      await finalizar(user);

      expect(await screen.findByText(/ya no se puede cerrar.*reintentar/i)).toBeInTheDocument();
      expect(screen.getByTitle(/Videoconsulta con Ana Gómez/)).toBeInTheDocument();

      completar = () => jsonResponse({ id: APPOINTMENT, status: 'COMPLETADO' });
      await finalizar(user);

      expect(
        await screen.findByRole('heading', { name: 'Evolución de la consulta' }),
      ).toBeInTheDocument();
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

    it('un turno sin pagar avisa y entra solo cuando se acredita el pago', async () => {
      // El webhook de MercadoPago puede llegar después de que el paciente vuelve.
      reloj('2026-08-20T12:55:00Z'); // dentro de la ventana
      turnos = [{ ...TURNO, status: 'RESERVADO_SIN_PAGAR' }];

      renderComponent();

      expect(await screen.findByText(/pagá el turno para entrar/i)).toBeVisible();
      expect(
        fetchSpy.mock.calls.filter(([u]: unknown[]) => String(u).includes('/video')),
      ).toHaveLength(0);

      turnos = [TURNO]; // el webhook acreditó el pago
      await act(async () => {
        await vi.advanceTimersByTimeAsync(6_000);
      });

      expect(await screen.findByTitle(/Videoconsulta con Ana Gómez/)).toBeInTheDocument();
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
