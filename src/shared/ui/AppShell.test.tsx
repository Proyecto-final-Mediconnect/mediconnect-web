// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from './AppShell';
import type { SessionUser } from '../../features/auth/types/session';

const PACIENTE: SessionUser = {
  id: 'u1',
  email: 'marina@test.com',
  role: 'PACIENTE',
  firstName: 'Marina',
  lastName: 'Sosa',
};

const MODERADOR: SessionUser = {
  id: 'u3',
  email: 'mod@test.com',
  role: 'MODERADOR',
  firstName: 'Lucía',
  lastName: 'Peralta',
};

const PROFESIONAL: SessionUser = {
  id: 'u2',
  email: 'valeria@test.com',
  role: 'PROFESIONAL',
  firstName: 'Valeria',
  lastName: 'Ocampo',
};

function json(body: unknown, status = 200): Response {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * El menú lee la sesión y los turnos. Se responden por URL y no con una sola
 * respuesta para todo: el ítem de videoconsulta depende de que
 * `/appointments/me` devuelva una lista de verdad.
 */
function renderShell(
  user: SessionUser | null,
  ruta = '/paciente',
  appointments: unknown[] = [],
) {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input);
    if (url.includes('/appointments/me')) return Promise.resolve(json(appointments));
    return Promise.resolve(user ? json(user) : json(null, 401));
  });

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[ruta]}>
        <AppShell title="Panel">
          <p>contenido</p>
        </AppShell>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** El menú lateral, para afirmar sobre él sin tocar el resto de la pantalla. */
function menu() {
  return within(screen.getByRole('navigation'));
}

describe('AppShell', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('muestra el título de la sección y el contenido', async () => {
    renderShell(PACIENTE);

    expect(await screen.findByRole('heading', { name: 'Panel' })).toBeVisible();
    expect(screen.getByText('contenido')).toBeVisible();
  });

  it('al paciente le ofrece sus secciones', async () => {
    renderShell(PACIENTE);
    await screen.findByText('Marina Sosa');

    expect(menu().getByRole('link', { name: 'Mis turnos' })).toBeVisible();
    expect(menu().getByRole('link', { name: 'Buscar profesionales' })).toBeVisible();
    expect(menu().getByRole('link', { name: 'Mi perfil' })).toBeVisible();
  });

  it('al profesional le ofrece las suyas, que no son las mismas', async () => {
    renderShell(PROFESIONAL, '/profesional');
    await screen.findByText('Valeria Ocampo');

    expect(menu().getByRole('link', { name: 'Mi agenda' })).toBeVisible();
    expect(menu().getByRole('link', { name: 'Mis consultas' })).toBeVisible();
    // "Buscar profesionales" es del recorrido del paciente: un profesional no
    // reserva turnos con otros desde su panel.
    expect(menu().queryByRole('link', { name: 'Buscar profesionales' })).not.toBeInTheDocument();
  });

  it('marca la sección actual para lectores de pantalla', async () => {
    renderShell(PACIENTE, '/mis-turnos');
    await screen.findByText('Marina Sosa');

    expect(menu().getByRole('link', { name: 'Mis turnos' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(menu().getByRole('link', { name: 'Panel' })).not.toHaveAttribute('aria-current');
  });

  it('identifica a quién tiene la sesión abierta y con qué rol', async () => {
    renderShell(PROFESIONAL, '/profesional');

    expect(await screen.findByText('Valeria Ocampo')).toBeVisible();
    expect(screen.getByText('Profesional')).toBeVisible();
    expect(screen.getByText('VO')).toBeVisible();
  });

  it('ofrece cerrar sesión', async () => {
    renderShell(PACIENTE);
    await screen.findByText('Marina Sosa');

    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeVisible();
  });

  it('cerrar sesión pide confirmación en vez de salir de una', async () => {
    // Es un click de un solo paso que corta el trabajo en curso: en un turno o
    // una consulta abierta, hacerlo sin preguntar duele.
    const user = userEvent.setup();
    renderShell(PACIENTE);
    await screen.findByText('Marina Sosa');

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText(/¿cerrás la sesión\?/i)).toBeVisible();
    expect(within(dialogo).getByRole('button', { name: 'Seguir acá' })).toBeVisible();
  });

  it('"Seguir acá" cierra el diálogo sin desloguear', async () => {
    const user = userEvent.setup();
    renderShell(PACIENTE);
    await screen.findByText('Marina Sosa');

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await user.click(await screen.findByRole('button', { name: 'Seguir acá' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // El menú sigue en pie: no se llamó al logout.
    expect(menu().getByRole('link', { name: 'Panel' })).toBeVisible();
  });

  it('sin sesión cargada no rompe: cae al menú de paciente', async () => {
    renderShell(null);

    // El guard es RequireAuth, no el shell. Acá solo importa que no explote
    // mientras la sesión todavía no resolvió.
    expect(await screen.findByRole('heading', { name: 'Panel' })).toBeVisible();
    expect(menu().getByRole('link', { name: 'Panel' })).toBeVisible();
  });
  describe('acceso a la videoconsulta', () => {
    /** Turno de las 10:00 (13:00 UTC) del 20/08/2026. */
    const TURNO = {
      id: 'ap1',
      scheduledAt: '2026-08-20T13:00:00Z',
      date: '2026-08-20',
      startTime: '10:00',
      durationMinutes: 30,
      price: 12000,
      currency: 'ARS',
      status: 'CONFIRMADO',
      professional: { id: 'p1', firstName: 'Ana', lastName: 'Médica' },
      patient: { id: 'u1', firstName: 'Marina', lastName: 'Sosa' },
    };

    afterEach(() => {
      vi.useRealTimers();
    });

    /** Cinco minutos antes del turno: la sala ya está abierta. */
    function dentroDeLaVentana() {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(new Date('2026-08-20T12:55:00Z'));
    }

    it('sin consulta abierta el ítem está, pero apagado', async () => {
      renderShell(PACIENTE);
      await screen.findByText('Marina Sosa');

      const item = menu().getByText('Videoconsulta');
      expect(item).toBeVisible();
      // No es un enlace: llevaría a una ruta que necesita un turno.
      expect(menu().queryByRole('link', { name: /videoconsulta/i })).not.toBeInTheDocument();
    });

    it('el ítem apagado explica por qué', async () => {
      renderShell(PACIENTE);
      await screen.findByText('Marina Sosa');

      // `closest('[title]')` y no `closest('span')`: con la barra plegable la
      // etiqueta vive en un span anidado dentro del que lleva el title.
      expect(menu().getByText('Videoconsulta').closest('[title]')).toHaveAttribute(
        'title',
        expect.stringMatching(/turno agendado/i),
      );
    });

    it('con un turno futuro lleva a su sala de espera, sin decir "en vivo"', async () => {
      // Se puede entrar antes de hora: la sala de espera dice cuánto falta.
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(new Date('2026-08-18T13:00:00Z')); // dos días antes
      renderShell(PACIENTE, '/paciente', [TURNO]);

      const enlace = await menu().findByRole('link', { name: /videoconsulta/i });
      expect(enlace).toHaveAttribute('href', '/turnos/ap1/videoconsulta');
      expect(enlace).not.toHaveTextContent(/en vivo/i);
    });

    it('con la sala abierta apunta a ese turno', async () => {
      dentroDeLaVentana();
      renderShell(PACIENTE, '/paciente', [TURNO]);

      const enlace = await menu().findByRole('link', { name: /videoconsulta/i });
      expect(enlace).toHaveAttribute('href', '/turnos/ap1/videoconsulta');
      expect(enlace).toHaveTextContent(/en vivo/i);
    });

    it('el profesional también lo tiene', async () => {
      // La consulta es de los dos: el que atiende entra por el mismo lugar.
      dentroDeLaVentana();
      renderShell(PROFESIONAL, '/profesional', [TURNO]);

      const enlace = await menu().findByRole('link', { name: /videoconsulta/i });
      expect(enlace).toHaveAttribute('href', '/turnos/ap1/videoconsulta');
    });

    it('un turno cancelado en la ventana no enciende nada', async () => {
      dentroDeLaVentana();
      renderShell(PACIENTE, '/paciente', [{ ...TURNO, status: 'CANCELADO' }]);
      await screen.findByText('Marina Sosa');

      expect(menu().queryByRole('link', { name: /videoconsulta/i })).not.toBeInTheDocument();
    });
  });
  describe('moderador', () => {
    it('ve su sección, y no las del paciente', async () => {
      // Antes caía en el menú del paciente: cuatro de sus cinco ítems le
      // devolvían 403, y su única pantalla real no estaba.
      renderShell(MODERADOR, '/moderacion');
      await screen.findByText('Lucía Peralta');

      expect(menu().getByRole('link', { name: 'Moderación' })).toBeVisible();
      expect(menu().queryByRole('link', { name: 'Mis turnos' })).not.toBeInTheDocument();
      expect(
        menu().queryByRole('link', { name: 'Mi historia clínica' }),
      ).not.toBeInTheDocument();
      expect(menu().queryByRole('link', { name: 'Panel' })).not.toBeInTheDocument();
    });

    it('se lo identifica como Moderador, no como Paciente', async () => {
      renderShell(MODERADOR, '/moderacion');

      expect(await screen.findByText('Moderador')).toBeVisible();
    });

    it('no le ofrece la videoconsulta: no atiende ni se atiende', async () => {
      renderShell(MODERADOR, '/moderacion');
      await screen.findByText('Lucía Peralta');

      expect(menu().queryByText('Videoconsulta')).not.toBeInTheDocument();
    });

    it('no pide los turnos: no tiene ninguno', async () => {
      renderShell(MODERADOR, '/moderacion');
      await screen.findByText('Lucía Peralta');

      const aTurnos = vi
        .mocked(globalThis.fetch)
        .mock.calls.filter(([url]) => String(url).includes('/appointments/me'));

      expect(aTurnos).toHaveLength(0);
    });
  });
});
