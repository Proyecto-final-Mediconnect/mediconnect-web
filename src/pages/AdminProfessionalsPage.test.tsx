// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminProfessionalDetailPage } from './AdminProfessionalDetailPage';
import { AdminProfessionalsPage } from './AdminProfessionalsPage';

const SESION = {
  id: 'a1',
  email: 'admin@test.com',
  role: 'ADMINISTRADOR',
  firstName: null,
  lastName: null,
};
const PRO_ID = '22222222-2222-4222-8222-222222222222';

const FILA = {
  id: PRO_ID,
  firstName: 'Ana',
  lastName: 'Pérez',
  licenseNumber: 'MP-12345',
  specialties: ['Clínica médica'],
  status: 'VALIDADO',
  registeredAt: '2026-08-01T13:00:00.000Z',
  activity: { completed: 7, incidents: 2, rating: 4.7, reviews: 3 },
};

const STATS = {
  from: '2026-09-01',
  to: '2026-11-30',
  turnos: { completados: 7, noAsistio: 1, cancelados: 1, liberados: 0, porVenir: 2 },
  incidencias: { cancelaciones: 1, ausencias: 1, fallasTecnicas: 0 },
  tasas: {
    cancelacion: { porcentaje: 11.1, numerador: 1, denominador: 9 },
    ausentismo: { porcentaje: 12.5, numerador: 1, denominador: 8 },
  },
  consultasPorMes: [],
  pacientes: { unicos: 5, recurrentes: 2 },
  resenas: { promedio: 4.7, cantidad: 3, sinResponder: 0 },
};

const DETALLE = {
  id: PRO_ID,
  firstName: 'Ana',
  lastName: 'Pérez',
  email: 'ana@test.com',
  licenseNumber: 'MP-12345',
  specialties: ['Clínica médica'],
  status: 'VALIDADO',
  registeredAt: '2026-08-01T13:00:00.000Z',
  consultationPrice: 15000,
  currency: 'ARS',
  stats: STATS,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockApi(
  handlers: {
    list?: (url: string) => Response;
    detail?: () => Response;
    preview?: () => Response;
    change?: () => Response;
  } = {},
) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    if (init?.method === 'PATCH') {
      return Promise.resolve(
        handlers.change?.() ??
          json({ id: PRO_ID, status: 'SUSPENDIDO', refunded: 2, cancelled: 1 }),
      );
    }
    if (url.includes('/suspension-preview')) {
      return Promise.resolve(handlers.preview?.() ?? json({ paid: 2, unpaid: 1 }));
    }
    if (url.includes(`/admin/professionals/${PRO_ID}`)) {
      return Promise.resolve(handlers.detail?.() ?? json(DETALLE));
    }
    if (url.includes('/admin/professionals')) {
      return Promise.resolve(
        handlers.list?.(url) ?? json({ items: [FILA], total: 1, page: 1, pageSize: 20 }),
      );
    }
    if (url.includes('/notifications/me')) {
      return Promise.resolve(json({ unreadCount: 0, notifications: [] }));
    }
    return Promise.resolve(json(SESION));
  });
}

function renderAt(ruta: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/admin/profesionales" element={<AdminProfessionalsPage />} />
          <Route
            path="/admin/profesionales/:professionalId"
            element={<AdminProfessionalDetailPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const pedidos = (spy: ReturnType<typeof mockApi>) =>
  spy.mock.calls
    .map(([u]) => String(u))
    .filter((u) => u.includes('/admin/professionals') && !u.includes(PRO_ID));

/** ENG-241 — el listado de profesionales y la suspensión. */
describe('Profesionales (administrador)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('lista con el estado y la actividad, y cada fila abre el detalle', async () => {
    mockApi();
    renderAt('/admin/profesionales');

    const fila = await screen.findByRole('link', { name: /Pérez, Ana/ });
    expect(fila).toHaveAttribute('href', `/admin/profesionales/${PRO_ID}`);
    expect(fila).toHaveTextContent('Clínica médica · Matrícula MP-12345');
    expect(fila).toHaveTextContent('7 consultas · 2 incidencias · ★ 4,7 (3)');
    expect(fila).toHaveTextContent('Validado');
  });

  it('filtra por estado y busca, volviendo a la primera página', async () => {
    const spy = mockApi();
    renderAt('/admin/profesionales');
    const user = userEvent.setup();
    await screen.findByRole('link', { name: /Pérez, Ana/ });

    await user.click(screen.getByRole('button', { name: 'Suspendidos' }));
    await waitFor(() => expect(pedidos(spy).at(-1)).toContain('status=SUSPENDIDO'));

    await user.type(screen.getByLabelText('Buscar por nombre o matrícula'), ' pérez ');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    await waitFor(() => expect(pedidos(spy).at(-1)).toContain('q=p%C3%A9rez'));
    expect(pedidos(spy).at(-1)).not.toContain('page=');
  });

  it('pagina de a 20', async () => {
    const spy = mockApi({
      list: (url) =>
        json({
          items: [FILA],
          total: 45,
          page: url.includes('page=2') ? 2 : 1,
          pageSize: 20,
        }),
    });
    renderAt('/admin/profesionales');
    const user = userEvent.setup();

    expect(await screen.findByText(/Página 1 de 3 · 45 profesionales/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await waitFor(() => expect(pedidos(spy).at(-1)).toContain('page=2'));
  });

  it('sin resultados lo dice', async () => {
    mockApi({ list: () => json({ items: [], total: 0, page: 1, pageSize: 20 }) });
    renderAt('/admin/profesionales');

    expect(await screen.findByText('No hay profesionales con este filtro.')).toBeInTheDocument();
  });

  describe('detalle', () => {
    it('muestra los datos y la actividad', async () => {
      mockApi();
      renderAt(`/admin/profesionales/${PRO_ID}`);

      expect(await screen.findByRole('heading', { name: 'Ana Pérez' })).toBeInTheDocument();
      const datos = screen.getByRole('region', { name: 'Datos del profesional' });
      expect(datos).toHaveTextContent('MP-12345');
      expect(datos).toHaveTextContent('ana@test.com');
      expect(datos).toHaveTextContent('$');
      const actividad = screen.getByRole('region', { name: 'Actividad de los últimos 3 meses' });
      expect(actividad).toHaveTextContent('Consultas completadas7');
      expect(actividad).toHaveTextContent('Cancelación11,1 %');
      expect(actividad).toHaveTextContent('Consultas sin conectarse1');
    });

    it('suspender muestra el impacto, pide el motivo y lo suspende', async () => {
      const spy = mockApi();
      renderAt(`/admin/profesionales/${PRO_ID}`);
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: 'Suspender' }));
      const dialogo = await screen.findByRole('dialog');
      expect(
        await within(dialogo).findByText(/Se reembolsan al 100 % 2 turnos pagados/),
      ).toBeInTheDocument();
      expect(within(dialogo).getByText('Se cancela 1 reserva sin pagar.')).toBeInTheDocument();

      await user.click(within(dialogo).getByRole('button', { name: 'Sí, suspender' }));
      expect(within(dialogo).getByText(/al menos 10 caracteres/)).toBeInTheDocument();
      expect(spy.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);

      await user.type(
        within(dialogo).getByLabelText('Motivo'),
        'La matrícula figura suspendida en el colegio.',
      );
      await user.click(within(dialogo).getByRole('button', { name: 'Sí, suspender' }));

      expect(await screen.findByRole('status')).toHaveTextContent(
        'Suspendiste a Ana Pérez. Se resolvieron 3 turnos y les avisamos a los pacientes.',
      );
      const [url, init] = spy.mock.calls.find(([, i]) => i?.method === 'PATCH')!;
      expect(String(url)).toContain(`/admin/professionals/${PRO_ID}/suspension`);
      expect(init?.body).toBe(
        JSON.stringify({ reason: 'La matrícula figura suspendida en el colegio.' }),
      );
    });

    it('un suspendido se reactiva con motivo', async () => {
      const spy = mockApi({
        detail: () => json({ ...DETALLE, status: 'SUSPENDIDO' }),
        change: () => json({ id: PRO_ID, status: 'VALIDADO' }),
      });
      renderAt(`/admin/profesionales/${PRO_ID}`);
      const user = userEvent.setup();

      expect(screen.queryByRole('button', { name: 'Suspender' })).not.toBeInTheDocument();
      await user.click(await screen.findByRole('button', { name: 'Reactivar' }));
      const dialogo = await screen.findByRole('dialog');
      await user.type(
        within(dialogo).getByLabelText('Motivo'),
        'El colegio confirmó la matrícula vigente.',
      );
      await user.click(within(dialogo).getByRole('button', { name: 'Sí, reactivar' }));

      expect(await screen.findByRole('status')).toHaveTextContent(
        'Reactivaste a Ana Pérez. Ya aparece en el catálogo.',
      );
      expect(
        spy.mock.calls.some(
          ([u, i]) => i?.method === 'PATCH' && String(u).includes('/reactivation'),
        ),
      ).toBe(true);
    });

    it('un pendiente lleva a revisar la matrícula, sin suspender', async () => {
      mockApi({ detail: () => json({ ...DETALLE, status: 'PENDIENTE_VALIDACION_MATRICULA' }) });
      renderAt(`/admin/profesionales/${PRO_ID}`);

      expect(await screen.findByRole('link', { name: 'Revisar la matrícula' })).toHaveAttribute(
        'href',
        '/admin/matriculas',
      );
      expect(screen.queryByRole('button', { name: 'Suspender' })).not.toBeInTheDocument();
    });

    it('si el backend no lo deja suspender, muestra el error', async () => {
      mockApi({
        change: () => json({ message: 'Ese profesional ya está suspendido.' }, 409),
      });
      renderAt(`/admin/profesionales/${PRO_ID}`);
      const user = userEvent.setup();

      await user.click(await screen.findByRole('button', { name: 'Suspender' }));
      const dialogo = await screen.findByRole('dialog');
      await user.type(within(dialogo).getByLabelText('Motivo'), 'Un motivo de prueba largo.');
      await user.click(within(dialogo).getByRole('button', { name: 'Sí, suspender' }));

      expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
        'Ese profesional ya está suspendido.',
      );
    });
  });
});
