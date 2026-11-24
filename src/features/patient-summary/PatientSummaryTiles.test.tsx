// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { PatientSummaryTiles } from './PatientSummaryTiles';
import { descargarPdf } from '../../shared/lib/pdf/pdf';
import { textoDe } from '../../shared/lib/pdf/hoja';

// El PDF se arma de verdad en el armador de cada hoja; acá se mira qué se baja.
vi.mock('../../shared/lib/pdf/pdf', () => ({ descargarPdf: vi.fn(() => Promise.resolve()) }));

const RESUMEN = {
  from: '2026-10-22',
  to: '2026-11-20',
  currency: 'ARS',
  consultas: { realizadas: 3, profesionales: 2 },
  pagos: { pagado: 54000, reembolsado: 9000, neto: 45000, turnos: 3, porVenir: 2 },
  accesos: { medipass: 1, historiaClinica: 4, total: 5 },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderTiles(respuesta: () => Response) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve(respuesta()));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PatientSummaryTiles />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-11-20T15:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  cleanup();
});

describe('PatientSummaryTiles (ENG-198)', () => {
  it('muestra consultas, lo pagado, lo reembolsado y los accesos, cada uno con su link', async () => {
    renderTiles(() => json(RESUMEN));

    const consultas = await screen.findByRole('link', { name: /consultas realizadas/i });
    expect(consultas).toHaveTextContent('3');
    expect(consultas).toHaveAttribute('href', '/mis-turnos');
    expect(screen.getByRole('link', { name: /pagaste/i })).toHaveTextContent(/54\.000/);
    expect(screen.getByRole('link', { name: /pagaste/i })).toHaveTextContent(
      'Por 3 turnos · 2 pendientes',
    );
    expect(screen.getByRole('link', { name: /te reembolsaron/i })).toHaveTextContent(/9\.000/);
    const accesos = screen.getByRole('link', { name: /accesos a tu información/i });
    expect(accesos).toHaveTextContent('1 al MediPass · 4 a tu historia');
    expect(accesos).toHaveAttribute('href', '/mi-historia-clinica#accesos');
  });

  it('cambiar a este año pide el período nuevo', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderTiles(() => json(RESUMEN));
    await screen.findByRole('link', { name: /consultas realizadas/i });

    await user.click(screen.getByRole('button', { name: 'Este año' }));

    const urls = vi.mocked(globalThis.fetch).mock.calls.map(([u]) => String(u));
    expect(urls.some((u) => u.includes('from=2026-01-01&to=2026-11-20'))).toBe(true);
  });

  it('sin actividad lo dice en vez de mostrar ceros', async () => {
    renderTiles(() =>
      json({
        ...RESUMEN,
        consultas: { realizadas: 0, profesionales: 0 },
        pagos: { pagado: 0, reembolsado: 0, neto: 0, turnos: 0, porVenir: 0 },
        accesos: { medipass: 0, historiaClinica: 0, total: 0 },
      }),
    );

    expect(await screen.findByText(/sin actividad en últimos 30 días/i)).toBeVisible();
  });

  it('si falla, deja reintentar', async () => {
    renderTiles(() => json({ message: 'Se cayó.' }, 500));
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeVisible();
  });

  it('exporta el resumen a PDF con el detalle de pagos y accesos', async () => {
    vi.mocked(descargarPdf).mockClear();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderTiles(() => json(RESUMEN));
    await screen.findByRole('link', { name: /consultas realizadas/i });

    await user.click(screen.getByRole('button', { name: 'Exportar PDF' }));

    await waitFor(() => expect(descargarPdf).toHaveBeenCalledTimes(1));
    expect(print).not.toHaveBeenCalled();
    const [doc, archivo] = vi.mocked(descargarPdf).mock.calls[0];
    expect(archivo).toBe(`mi-resumen-${RESUMEN.from}-a-${RESUMEN.to}.pdf`);
    const texto = textoDe(doc.content);
    expect(texto).toContain('Resumen de tu actividad');
    expect(texto).toContain('ÚLTIMOS 30 DÍAS');
    expect(texto).toMatch(/Total neto \$\s?45\.000/);
    expect(texto).toContain('Accesos en total 5');
  });
});
