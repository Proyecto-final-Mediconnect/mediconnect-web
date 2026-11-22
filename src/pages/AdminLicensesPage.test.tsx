// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AdminLicensesPage, REGISTRO_PUBLICO_URL } from './AdminLicensesPage';

const SESION = {
  id: 'a1',
  email: 'admin@test.com',
  role: 'ADMINISTRADOR',
  firstName: null,
  lastName: null,
};

const PENDIENTE = {
  id: '22222222-2222-4222-8222-222222222222',
  firstName: 'Ana',
  lastName: 'Pérez',
  email: 'ana@test.com',
  licenseNumber: 'MP-12345',
  specialties: ['Clínica médica', 'Pediatría'],
  registeredAt: '2026-11-18T13:00:00.000Z',
  status: 'PENDIENTE_VALIDACION_MATRICULA',
  decision: null,
};

const RECHAZADA = {
  ...PENDIENTE,
  id: '33333333-3333-4333-8333-333333333333',
  firstName: 'Juan',
  lastName: 'Gómez',
  status: 'RECHAZADO',
  decision: { at: '2026-11-20T15:00:00.000Z', reason: 'No figura en el registro provincial.' },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderPage(
  opciones: {
    pendientes?: () => Response;
    rechazadas?: () => Response;
    decidir?: () => Response;
  } = {},
) {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    if (url.includes('/license') && init?.method === 'PATCH') {
      return Promise.resolve(
        opciones.decidir?.() ?? json({ id: PENDIENTE.id, status: 'VALIDADO' }),
      );
    }
    if (url.includes('status=PENDIENTE_VALIDACION_MATRICULA')) {
      return Promise.resolve(opciones.pendientes?.() ?? json([PENDIENTE]));
    }
    if (url.includes('status=RECHAZADO')) {
      return Promise.resolve(opciones.rechazadas?.() ?? json([RECHAZADA]));
    }
    if (url.includes('status=VALIDADO')) return Promise.resolve(json([]));
    if (url.includes('/notifications/me')) {
      return Promise.resolve(json({ unreadCount: 0, notifications: [] }));
    }
    return Promise.resolve(json(SESION));
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/admin/matriculas']}>
        <AdminLicensesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return fetchSpy;
}

const patches = (spy: ReturnType<typeof renderPage>) =>
  spy.mock.calls.filter(([, init]) => init?.method === 'PATCH');

/** ENG-192 — validar o rechazar matrículas desde el panel del administrador. */
describe('Matrículas', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('muestra los pendientes con la matrícula, el contador y el link al registro público', async () => {
    renderPage();

    const item = await screen.findByRole('listitem');
    expect(within(item).getByText('Ana Pérez')).toBeInTheDocument();
    expect(within(item).getByText('MP-12345')).toBeInTheDocument();
    expect(within(item).getByText('Clínica médica, Pediatría')).toBeInTheDocument();
    expect(item).toHaveTextContent('ana@test.com · Se registró el 18 de noviembre');
    expect(
      within(item).getByRole('link', { name: /Verificar en el registro público/ }),
    ).toHaveAttribute('href', REGISTRO_PUBLICO_URL);
    expect(screen.getByRole('tab', { name: /Pendientes/ })).toHaveTextContent('1');
  });

  it('validar pide confirmación y, al confirmar, lo valida y lo avisa', async () => {
    const spy = renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Validar' }));
    const dialogo = await screen.findByRole('dialog');
    expect(dialogo).toHaveTextContent('¿Validar a Ana Pérez?');
    expect(patches(spy)).toHaveLength(0);

    await user.click(within(dialogo).getByRole('button', { name: 'Sí, validar la matrícula' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Validaste a Ana Pérez. Ya aparece en el catálogo.',
    );
    const [url, init] = patches(spy)[0];
    expect(String(url)).toContain(`/admin/professionals/${PENDIENTE.id}/license`);
    expect(init?.body).toBe(JSON.stringify({ decision: 'VALIDADO' }));
  });

  it('rechazar sin motivo no manda nada; con motivo, lo manda', async () => {
    const spy = renderPage({
      decidir: () => json({ id: PENDIENTE.id, status: 'RECHAZADO' }),
    });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Rechazar' }));
    const dialogo = await screen.findByRole('dialog');
    await user.click(within(dialogo).getByRole('button', { name: 'Sí, rechazar la matrícula' }));
    expect(within(dialogo).getByText(/al menos 10 caracteres/)).toBeInTheDocument();
    expect(patches(spy)).toHaveLength(0);

    await user.type(
      within(dialogo).getByLabelText('Motivo'),
      'No figura en el registro del colegio.',
    );
    await user.click(within(dialogo).getByRole('button', { name: 'Sí, rechazar la matrícula' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Rechazaste la matrícula de Ana Pérez',
    );
    expect(patches(spy)[0][1]?.body).toBe(
      JSON.stringify({ decision: 'RECHAZADO', reason: 'No figura en el registro del colegio.' }),
    );
  });

  it('si otro administrador ya decidió, muestra el error del backend', async () => {
    renderPage({
      decidir: () =>
        json({ message: 'La matrícula de ese profesional ya tiene una decisión.' }, 409),
    });
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Validar' }));
    const dialogo = await screen.findByRole('dialog');
    await user.click(within(dialogo).getByRole('button', { name: 'Sí, validar la matrícula' }));

    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'La matrícula de ese profesional ya tiene una decisión.',
    );
  });

  it('la pestaña de rechazadas muestra la fecha y el motivo, sin botones', async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole('tab', { name: /Rechazadas/ }));

    const item = await screen.findByRole('listitem');
    expect(item).toHaveTextContent('Juan Gómez');
    expect(item).toHaveTextContent('Rechazada el 20 de noviembre');
    expect(item).toHaveTextContent('Motivo: No figura en el registro provincial.');
    expect(within(item).queryByRole('button')).not.toBeInTheDocument();
  });

  it('sin pendientes lo dice', async () => {
    renderPage({ pendientes: () => json([]) });

    expect(
      await screen.findByText('No hay profesionales esperando validación.'),
    ).toBeInTheDocument();
  });

  it('si la cola no carga, avisa y deja reintentar', async () => {
    let intentos = 0;
    renderPage({
      pendientes: () => {
        intentos += 1;
        return intentos === 1 ? json({ message: 'Algo salió mal' }, 500) : json([PENDIENTE]);
      },
    });
    const user = userEvent.setup();

    const alerta = await screen.findByRole('alert');
    await user.click(within(alerta).getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Ana Pérez')).toBeInTheDocument();
  });
});
