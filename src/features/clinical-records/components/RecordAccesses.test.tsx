// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RecordAccesses } from './RecordAccesses';
import type { ClinicalRecordAccessPage } from '../types/clinicalRecord';

/** ENG-165 — el paciente ve qué profesionales abrieron su historia clínica. */

const ANA = {
  id: 'log-1',
  profesional: { nombre: 'Ana García', especialidad: 'Cardiología', matricula: 'MP 45120' },
  el: '2026-10-30T15:00:00.000Z',
};

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderAccesses(paginas: Record<number, ClinicalRecordAccessPage>) {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const pagina = Number(new URL(String(input)).searchParams.get('pagina') ?? '1');
    return Promise.resolve(json(paginas[pagina]));
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <RecordAccesses />
    </QueryClientProvider>,
  );
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('RecordAccesses (ENG-165)', () => {
  it('arranca cerrada y no pide nada hasta abrirla', () => {
    const fetchMock = renderAccesses({ 1: { accesos: [], pagina: 1, hayMas: false } });

    expect(screen.getByRole('button', { name: /quién vio mi historia clínica/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('al abrirla lista quién la abrió, con especialidad, matrícula y fecha', async () => {
    renderAccesses({ 1: { accesos: [ANA], pagina: 1, hayMas: false } });

    await userEvent.click(screen.getByRole('button', { name: /quién vio mi historia clínica/i }));

    expect(await screen.findByText('Ana García')).toBeInTheDocument();
    expect(screen.getByText('Cardiología · Matrícula MP 45120')).toBeInTheDocument();
  });

  it('sin accesos lo dice', async () => {
    renderAccesses({ 1: { accesos: [], pagina: 1, hayMas: false } });

    await userEvent.click(screen.getByRole('button', { name: /quién vio mi historia clínica/i }));

    expect(
      await screen.findByText('Todavía nadie más que vos abrió tu historia clínica.'),
    ).toBeInTheDocument();
  });

  it('pagina hacia los más viejos', async () => {
    renderAccesses({
      1: { accesos: [ANA], pagina: 1, hayMas: true },
      2: {
        accesos: [
          { ...ANA, id: 'log-2', profesional: { ...ANA.profesional, nombre: 'Martín Olivares' } },
        ],
        pagina: 2,
        hayMas: false,
      },
    });

    await userEvent.click(screen.getByRole('button', { name: /quién vio mi historia clínica/i }));
    await userEvent.click(await screen.findByRole('button', { name: /más viejos/i }));

    expect(await screen.findByText('Martín Olivares')).toBeInTheDocument();
    expect(screen.getByText('Página 2')).toBeInTheDocument();
  });
});
