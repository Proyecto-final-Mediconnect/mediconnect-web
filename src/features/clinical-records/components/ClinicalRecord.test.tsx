// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClinicalRecord } from './ClinicalRecord';

const PATIENT = '11111111-1111-4111-8111-111111111111';

function makeEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'e1',
    patientId: PATIENT,
    professionalId: 'q1',
    sequenceNumber: 1,
    entryType: 'CONSULTA',
    fhirResourceType: 'ClinicalImpression',
    content: {
      resourceType: 'ClinicalImpression',
      description: 'Dolor lumbar de 3 días',
      note: [{ text: 'Reposo relativo' }],
    },
    consultationId: null,
    correctsEntryId: null,
    createdAt: '2026-08-27T12:00:00.000Z',
    contentHash: 'abcd1234'.repeat(8),
    previousHash: '0'.repeat(64),
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Ultimo POST que hizo el componente, ya parseado. */
function lastPostBody(
  spy: ReturnType<typeof vi.spyOn>,
): Record<string, unknown> | undefined {
  const calls = spy.mock.calls as unknown as [RequestInfo, RequestInit?][];
  const post = calls.filter((call) => call[1]?.method === 'POST').pop();
  return post?.[1]?.body
    ? (JSON.parse(post[1].body as string) as Record<string, unknown>)
    : undefined;
}

/** Cuantos POST se dispararon. */
function postCount(spy: ReturnType<typeof vi.spyOn>): number {
  const calls = spy.mock.calls as unknown as [RequestInfo, RequestInit?][];
  return calls.filter((call) => call[1]?.method === 'POST').length;
}

function renderRecord(props: { consultationId?: string } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ClinicalRecord patientId={PATIENT} {...props} />
    </QueryClientProvider>,
  );
}

describe('ClinicalRecord', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;
  let entries: unknown[];

  beforeEach(() => {
    entries = [];
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation((_input, init): Promise<Response> => {
        if ((init?.method ?? 'GET') === 'POST') {
          const created = makeEntry({ id: 'nueva', sequenceNumber: entries.length + 1 });
          entries = [...entries, created];
          return Promise.resolve(jsonResponse(created, 201));
        }
        return Promise.resolve(jsonResponse(entries));
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  describe('formulario', () => {
    it('avisa que lo guardado no se puede editar ni borrar', async () => {
      // Es lo primero que tiene que saber quien escribe un asiento clínico.
      renderRecord();

      expect(await screen.findByText(/no se puede editar ni borrar/i)).toBeInTheDocument();
    });

    it('ofrece los cuatro campos del criterio de aceptación', () => {
      renderRecord();

      expect(screen.getByLabelText(/tipo de entrada/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/motivo de consulta/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/evolución y hallazgos/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/diagnóstico/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/plan e indicaciones/i)).toBeInTheDocument();
    });

    it('no pide la fecha: la pone el servidor al sellar', () => {
      // Dejar elegirla permitiría antedatar un asiento con la cadena cerrando.
      renderRecord();

      expect(screen.queryByLabelText(/fecha/i)).not.toBeInTheDocument();
    });

    it('no ofrece CORRECCION, que es ENG-100', () => {
      renderRecord();

      const select = screen.getByLabelText(/tipo de entrada/i);
      expect(within(select).queryByText(/corrección/i)).not.toBeInTheDocument();
    });

    it('exige el motivo antes de mandar nada', async () => {
      renderRecord();

      await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

      expect(await screen.findByText(/el motivo es obligatorio/i)).toBeInTheDocument();
      expect(postCount(fetchSpy)).toBe(0);
    });

    it('manda solo los campos completados', async () => {
      renderRecord();

      await userEvent.type(screen.getByLabelText(/motivo de consulta/i), 'Control');
      await userEvent.type(screen.getByLabelText(/plan e indicaciones/i), 'Volver en 7 días');
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

      await waitFor(() =>
        expect(lastPostBody(fetchSpy)).toEqual({
          entryType: 'CONSULTA',
          reason: 'Control',
          plan: 'Volver en 7 días',
        }),
      );
    });

    it('nunca manda professionalId ni createdAt', async () => {
      // Los dos entran a la preimagen del hash y los pone el servidor.
      renderRecord();

      await userEvent.type(screen.getByLabelText(/motivo de consulta/i), 'Control');
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

      await waitFor(() => {
        const body = lastPostBody(fetchSpy);
        expect(body).toBeDefined();
        expect(body).not.toHaveProperty('professionalId');
        expect(body).not.toHaveProperty('createdAt');
      });
    });

    it('asocia la entrada a la consulta en curso cuando la hay', async () => {
      renderRecord({ consultationId: '44444444-4444-4444-8444-444444444444' });

      await userEvent.type(screen.getByLabelText(/motivo de consulta/i), 'Durante la consulta');
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

      await waitFor(() =>
        expect(lastPostBody(fetchSpy)?.consultationId).toBe(
          '44444444-4444-4444-8444-444444444444',
        ),
      );
    });

    it('la entrada aparece en la lista apenas se guarda', async () => {
      // Es el cuarto criterio de aceptación.
      renderRecord();

      expect(await screen.findByText(/todavía no hay entradas/i)).toBeInTheDocument();

      await userEvent.type(screen.getByLabelText(/motivo de consulta/i), 'Dolor lumbar de 3 días');
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

      expect(await screen.findByText('Dolor lumbar de 3 días')).toBeInTheDocument();
    });

    it('limpia el formulario después de guardar', async () => {
      renderRecord();

      const motivo = screen.getByLabelText(/motivo de consulta/i);
      await userEvent.type(motivo, 'Control');
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

      await waitFor(() => expect(motivo).toHaveValue(''));
    });

    it('muestra el mensaje del backend cuando rechaza', async () => {
      fetchSpy.mockImplementation((_input: unknown, init?: RequestInit) =>
        Promise.resolve(
          (init?.method ?? 'GET') === 'POST'
            ? jsonResponse(
                {
                  message:
                    'Solo podés escribir en la historia clínica de un paciente al que atendiste.',
                },
                403,
              )
            : jsonResponse([]),
        ),
      );

      renderRecord();
      await userEvent.type(screen.getByLabelText(/motivo de consulta/i), 'Control');
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

      expect(
        await screen.findByText(/paciente al que atendiste/i),
      ).toBeInTheDocument();
    });
  });

  describe('listado', () => {
    it('muestra el hash y la posición en la cadena', async () => {
      // Es la evidencia visible de que la entrada está sellada.
      entries = [makeEntry()];
      renderRecord();

      expect(await screen.findByText(/#1 · abcd1234/)).toBeInTheDocument();
    });

    it('muestra lo más reciente primero', async () => {
      entries = [
        makeEntry({ id: 'vieja', sequenceNumber: 1, content: { description: 'La vieja' } }),
        makeEntry({ id: 'nueva', sequenceNumber: 2, content: { description: 'La nueva' } }),
      ];
      renderRecord();

      const items = await screen.findAllByRole('listitem');
      expect(items[0]).toHaveTextContent('La nueva');
    });

    it('marca las entradas que corrigen a otra', async () => {
      entries = [makeEntry({ entryType: 'CORRECCION', correctsEntryId: 'vieja' })];
      renderRecord();

      expect(
        await screen.findByText(/corrige a una anterior, que sigue en la historia/i),
      ).toBeInTheDocument();
    });

    it('no rompe con un content de forma inesperada', async () => {
      entries = [makeEntry({ content: 'texto suelto' })];
      renderRecord();

      expect(await screen.findByText(/#1 ·/)).toBeInTheDocument();
    });
  });
});
