// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AdminPlatformPage } from './AdminPlatformPage';

const NOW = new Date('2026-11-22T15:00:00Z');
const SESION = {
  id: 'a1',
  email: 'admin@test.com',
  role: 'ADMINISTRADOR',
  firstName: null,
  lastName: null,
};

const STATS = {
  from: '2026-09-01',
  to: '2026-11-30',
  usuarios: { pacientes: 40, profesionales: 8, nuevos: 6 },
  profesionales: {
    validados: 6,
    pendientes: 2,
    rechazados: 0,
    suspendidos: 1,
    porEspecialidad: [
      { especialidad: 'Clínica médica', profesionales: 4 },
      { especialidad: 'Pediatría', profesionales: 2 },
    ],
  },
  turnos: {
    total: 30,
    completados: 20,
    cancelados: 4,
    noAsistio: 2,
    liberados: 1,
    pendientes: 3,
    porMes: [
      { mes: '2026-09', turnos: 8, completados: 6 },
      { mes: '2026-10', turnos: 0, completados: 0 },
      { mes: '2026-11', turnos: 22, completados: 14 },
    ],
  },
  cobros: { moneda: 'ARS', cobrado: 300000, reembolsado: 15000, neto: 285000, pagos: 22 },
  resenas: { cantidad: 9, promedio: 4.6 },
  integridad: {
    at: '2026-11-17T03:00:00.000Z',
    status: 'OK',
    inconsistencies: 0,
    patientsChecked: 40,
    entriesChecked: 512,
  },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderPage(stats: (url: string) => Response = () => json(STATS)) {
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input);
    if (url.includes('/admin/stats')) return Promise.resolve(stats(url));
    if (url.includes('/notifications/me')) {
      return Promise.resolve(json({ unreadCount: 0, notifications: [] }));
    }
    return Promise.resolve(json(SESION));
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/admin/plataforma']}>
        <AdminPlatformPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return spy;
}

const pedidos = (spy: ReturnType<typeof renderPage>) =>
  spy.mock.calls.map(([u]) => String(u)).filter((u) => u.includes('/admin/stats'));

/** ENG-195 — el panel de plataforma del administrador. */
describe('Plataforma', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    cleanup();
  });

  it('arriba, la integridad de la historia clínica en verde con lo verificado', async () => {
    renderPage();

    const tarjeta = await screen.findByRole('region', {
      name: 'Integridad de la historia clínica',
    });
    expect(tarjeta).toHaveTextContent('La historia clínica está íntegra');
    expect(tarjeta).toHaveTextContent('Última verificación: 17 de noviembre · 00:00');
    expect(tarjeta).toHaveTextContent('40 historias, 512 registros verificados');
  });

  it('muestra los totales, el gráfico por mes y el detalle', async () => {
    renderPage();

    const usuarios = await screen.findByRole('group', { name: 'Usuarios' });
    expect(usuarios).toHaveTextContent('48');
    expect(usuarios).toHaveTextContent('40 pacientes y 8 profesionales · 6 nuevos en el período');
    expect(screen.getByRole('group', { name: 'Cobrado neto' })).toHaveTextContent('285.000');
    expect(screen.getByRole('group', { name: 'Reseñas' })).toHaveTextContent('4,6 ★');

    const meses = within(screen.getByRole('list', { name: 'Turnos por mes' })).getAllByRole(
      'listitem',
    );
    expect(meses).toHaveLength(3);
    expect(meses[0]).toHaveTextContent('septiembre de 2026: 8 turnos, 6 completados');

    const pros = screen.getByRole('region', { name: 'Profesionales' });
    expect(within(pros).getByRole('link', { name: 'Revisar' })).toHaveAttribute(
      'href',
      '/admin/matriculas',
    );
    expect(
      within(pros).getByRole('list', { name: 'Profesionales validados por especialidad' }),
    ).toHaveTextContent('Clínica médica4');
  });

  it('una inconsistencia se ve en rojo y lo dice', async () => {
    renderPage(() =>
      json({
        ...STATS,
        integridad: { ...STATS.integridad, status: 'INCONSISTENT', inconsistencies: 2 },
      }),
    );

    const tarjeta = await screen.findByRole('region', {
      name: 'Integridad de la historia clínica',
    });
    expect(tarjeta).toHaveTextContent('Se encontraron 2 inconsistencias');
    expect(tarjeta).toHaveClass('bg-danger/5');
  });

  it('si la verificación nunca corrió, lo explica', async () => {
    renderPage(() => json({ ...STATS, integridad: null }));

    expect(
      await screen.findByText(
        'Todavía no corrió ninguna verificación. Corre sola todas las semanas.',
      ),
    ).toBeInTheDocument();
  });

  it('pide por defecto los últimos 3 meses y, al cambiar, el rango nuevo', async () => {
    const spy = renderPage();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await screen.findByRole('group', { name: 'Usuarios' });

    expect(pedidos(spy)[0]).toContain('from=2026-09-01&to=2026-11-30');
    await user.click(screen.getByRole('button', { name: 'Últimos 12 meses' }));
    await waitFor(() => expect(pedidos(spy).at(-1)).toContain('from=2025-12-01&to=2026-11-30'));
  });

  it('si falla, avisa y deja reintentar', async () => {
    let intentos = 0;
    renderPage(() => {
      intentos += 1;
      return intentos === 1 ? json({ message: 'Algo salió mal' }, 500) : json(STATS);
    });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    const alerta = await screen.findByRole('alert');
    await user.click(within(alerta).getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('group', { name: 'Usuarios' })).toBeInTheDocument();
  });
});
