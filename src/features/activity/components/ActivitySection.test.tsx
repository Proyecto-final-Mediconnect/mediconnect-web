// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ActivitySection } from './ActivitySection';
import type { ProfessionalStats } from '../types';

const NOW = new Date('2026-11-14T15:00:00Z');

const STATS: ProfessionalStats = {
  from: '2026-09-01',
  to: '2026-11-30',
  turnos: { completados: 21, noAsistio: 2, cancelados: 2, liberados: 1, porVenir: 4 },
  tasas: {
    cancelacion: { porcentaje: 8, numerador: 2, denominador: 25 },
    ausentismo: { porcentaje: 8.7, numerador: 2, denominador: 23 },
  },
  consultasPorMes: [
    { mes: '2026-09', consultas: 8 },
    { mes: '2026-10', consultas: 0 },
    { mes: '2026-11', consultas: 13 },
  ],
  pacientes: { unicos: 15, recurrentes: 4 },
  resenas: { promedio: 4.7, cantidad: 12, sinResponder: 2 },
};

const VACIO: ProfessionalStats = {
  ...STATS,
  turnos: { completados: 0, noAsistio: 0, cancelados: 0, liberados: 0, porVenir: 0 },
  tasas: { cancelacion: null, ausentismo: null },
  consultasPorMes: STATS.consultasPorMes.map((m) => ({ ...m, consultas: 0 })),
  pacientes: { unicos: 0, recurrentes: 0 },
  resenas: { promedio: null, cantidad: 0, sinResponder: 0 },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const pedidos = () =>
  vi
    .mocked(globalThis.fetch)
    .mock.calls.map(([u]) => String(u))
    .filter((u) => u.includes('/professionals/me/stats'));

function renderSection(stats: (url: string) => Response) {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) =>
    Promise.resolve(stats(String(input))),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ActivitySection />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** ENG-196 — "Mi actividad" en el panel del profesional. */
describe('Mi actividad', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('muestra las tasas con un decimal y su base, la calificación y las barras por mes', async () => {
    renderSection(() => json(STATS));

    const cancel = await screen.findByRole('group', { name: 'Cancelaciones' });
    expect(within(cancel).getByText('8,0 %')).toBeInTheDocument();
    expect(within(cancel).getByText('2 de 25 turnos')).toBeInTheDocument();

    const ausentismo = screen.getByRole('group', { name: 'Ausentismo' });
    expect(within(ausentismo).getByText('8,7 %')).toBeInTheDocument();
    expect(within(ausentismo).getByText('2 de 23 turnos sin el paciente')).toBeInTheDocument();

    const completadas = screen.getByRole('group', { name: 'Consultas completadas' });
    expect(within(completadas).getByText('21')).toBeInTheDocument();
    expect(within(completadas).getByText('4 turnos confirmados por venir')).toBeInTheDocument();

    const rating = screen.getByRole('group', { name: 'Calificación' });
    expect(within(rating).getByText('4,7 ★')).toBeInTheDocument();
    expect(within(rating).getByText(/12 reseñas/)).toBeInTheDocument();
    expect(within(rating).getByRole('link', { name: '2 sin responder' })).toHaveAttribute(
      'href',
      '/profesional/resenas',
    );

    const barras = screen.getByRole('list', { name: 'Consultas completadas por mes' });
    const meses = within(barras).getAllByRole('listitem');
    expect(meses).toHaveLength(3);
    expect(meses[0]).toHaveTextContent('septiembre de 2026: 8 consultas');
    expect(meses[1]).toHaveTextContent('octubre de 2026: 0 consultas');
    expect(within(meses[2]).getByTestId('barra')).toHaveStyle({ height: '100%' });

    expect(screen.getByText('volvieron más de una vez').previousSibling).toHaveTextContent('4');
  });

  it('muestra las cancelaciones, ausencias y fallas del profesional (ENG-237)', async () => {
    renderSection(() =>
      json({ ...STATS, incidencias: { cancelaciones: 2, ausencias: 1, fallasTecnicas: 0 } }),
    );

    const lista = await screen.findByLabelText('Tus incidencias');
    expect(lista).toHaveTextContent('Turnos que cancelaste2');
    expect(lista).toHaveTextContent('Consultas sin conectarte1');
    expect(lista).toHaveTextContent('Fallas técnicas informadas0');
  });

  it('pide por defecto los últimos 3 meses y, al cambiar, el rango nuevo', async () => {
    renderSection(() => json(STATS));
    await screen.findByRole('group', { name: 'Cancelaciones' });

    expect(pedidos()).toEqual([
      expect.stringContaining('/professionals/me/stats?from=2026-09-01&to=2026-11-30'),
    ]);
    expect(screen.getByRole('button', { name: 'Últimos 3 meses' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Últimos 12 meses' }));
    await waitFor(() => expect(pedidos().at(-1)).toContain('from=2025-12-01&to=2026-11-30'));

    await userEvent.click(screen.getByRole('button', { name: 'Este mes' }));
    await waitFor(() => expect(pedidos().at(-1)).toContain('from=2026-11-01&to=2026-11-30'));
    expect(screen.getByRole('button', { name: 'Este mes' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('sin turnos ni reseñas muestra el estado vacío y ningún 0 %', async () => {
    renderSection(() => json(VACIO));

    expect(
      await screen.findByText('Todavía no tenés consultas en este período.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/0,0 %/)).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Cancelaciones' })).not.toBeInTheDocument();
  });

  it('sin base para la tasa muestra una raya, no 0 %', async () => {
    renderSection(() =>
      json({
        ...VACIO,
        turnos: { ...VACIO.turnos, porVenir: 3 },
      }),
    );

    const cancel = await screen.findByRole('group', { name: 'Cancelaciones' });
    expect(within(cancel).getByText('—')).toBeInTheDocument();
    expect(within(cancel).getByText('Sin turnos cerrados para calcularla')).toBeInTheDocument();
    expect(
      within(screen.getByRole('group', { name: 'Calificación' })).getByText(
        'Sin reseñas en este período',
      ),
    ).toBeInTheDocument();
  });

  it('muestra un esqueleto mientras carga', async () => {
    renderSection(() => json(STATS));

    expect(screen.getByRole('status', { name: 'Cargando tu actividad' })).toBeInTheDocument();
    await screen.findByRole('group', { name: 'Cancelaciones' });
  });

  it('si falla, avisa y deja reintentar', async () => {
    let intentos = 0;
    renderSection(() => {
      intentos += 1;
      return intentos === 1 ? json({ message: 'Algo salió mal' }, 500) : json(STATS);
    });

    const alerta = await screen.findByRole('alert');
    await userEvent.click(within(alerta).getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('group', { name: 'Cancelaciones' })).toBeInTheDocument();
    expect(intentos).toBe(2);
  });

  it('exporta el reporte a PDF: arma la hoja con los números y abre la impresión', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderSection(() => json(STATS));
    await screen.findByRole('group', { name: 'Cancelaciones' });

    await userEvent.click(screen.getByRole('button', { name: 'Exportar PDF' }));

    await waitFor(() => expect(print).toHaveBeenCalledTimes(1));
    const hoja = document.querySelector('.hoja-reporte');
    expect(hoja?.parentElement).toBe(document.body);
    expect(hoja).toHaveTextContent('Reporte de actividad');
    expect(hoja).toHaveTextContent('Últimos 3 meses');
    expect(hoja).toHaveTextContent('Del 1 de septiembre al 30 de noviembre de 2026');
    expect(hoja).toHaveTextContent('Turnos cerrados25');

    // Al terminar de imprimir, la hoja se desmonta: no queda colgada del body.
    window.dispatchEvent(new Event('afterprint'));
    await waitFor(() => expect(document.querySelector('.hoja-reporte')).toBeNull());
  });

  it('sin turnos en el período no hay nada que exportar', async () => {
    renderSection(() => json(VACIO));
    await screen.findByText('Todavía no tenés consultas en este período.');

    expect(screen.getByRole('button', { name: 'Exportar PDF' })).toBeDisabled();
  });
});
