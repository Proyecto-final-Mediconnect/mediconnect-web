// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClinicalEntryForm } from './ClinicalEntryForm';

/**
 * El formulario de alta de una entrada de HC (ENG-58).
 *
 * Se prueba solo, sin la lista ni el diálogo que lo contienen: lo que decide es
 * qué se le manda al backend, y eso no depende de dónde esté montado. Lo que sí
 * depende del diálogo —que se cierre al guardar, que reabra vacío— se prueba en
 * `PatientClinicalRecordPage.test.tsx`.
 */

const PATIENT = '11111111-1111-4111-8111-111111111111';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** El último POST, ya parseado. */
function lastPostBody(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> | undefined {
  const calls = spy.mock.calls as unknown as [RequestInfo, RequestInit?][];
  const post = calls.filter((call) => call[1]?.method === 'POST').pop();
  return post?.[1]?.body
    ? (JSON.parse(post[1].body as string) as Record<string, unknown>)
    : undefined;
}

function postCount(spy: ReturnType<typeof vi.spyOn>): number {
  const calls = spy.mock.calls as unknown as [RequestInfo, RequestInit?][];
  return calls.filter((call) => call[1]?.method === 'POST').length;
}

function renderForm(props: { consultationId?: string; onSaved?: () => void; onCancel?: () => void } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ClinicalEntryForm patientId={PATIENT} {...props} />
    </QueryClientProvider>,
  );
}

describe('ClinicalEntryForm (ENG-58)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ id: 'nueva' }, 201));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('avisa que lo guardado no se puede editar ni borrar', () => {
    // Es lo primero que tiene que saber quien escribe un asiento clínico.
    renderForm();

    expect(screen.getByText(/no se puede editar ni borrar/i)).toBeInTheDocument();
  });

  it('ofrece los cuatro campos del criterio de aceptación', () => {
    renderForm();

    expect(screen.getByLabelText(/tipo de entrada/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/motivo de consulta/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/evolución y hallazgos/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/diagnóstico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/plan e indicaciones/i)).toBeInTheDocument();
  });

  it('no pide la fecha: la pone el servidor al sellar', () => {
    // Dejar elegirla permitiría antedatar un asiento con la cadena cerrando.
    renderForm();

    expect(screen.queryByLabelText(/fecha/i)).not.toBeInTheDocument();
  });

  it('no ofrece CORRECCION, que es ENG-100', () => {
    renderForm();

    const select = screen.getByLabelText(/tipo de entrada/i);
    expect(within(select).queryByText(/corrección/i)).not.toBeInTheDocument();
  });

  it('exige el motivo antes de mandar nada', async () => {
    renderForm();

    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByText(/el motivo es obligatorio/i)).toBeInTheDocument();
    expect(postCount(fetchSpy)).toBe(0);
  });

  it('manda solo los campos completados', async () => {
    renderForm();

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
    renderForm();

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
    renderForm({ consultationId: '44444444-4444-4444-8444-444444444444' });

    await userEvent.type(screen.getByLabelText(/motivo de consulta/i), 'Durante la consulta');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() =>
      expect(lastPostBody(fetchSpy)?.consultationId).toBe('44444444-4444-4444-8444-444444444444'),
    );
  });

  it('avisa cuando quedó guardado', async () => {
    // Es lo que usa el diálogo para cerrarse.
    const onSaved = vi.fn();
    renderForm({ onSaved });

    await userEvent.type(screen.getByLabelText(/motivo de consulta/i), 'Control');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it('no avisa de guardado si el backend rechazó', async () => {
    // Cerrar el diálogo ante un 403 dejaría a la persona creyendo que el asiento
    // quedó escrito.
    const onSaved = vi.fn();
    fetchSpy.mockResolvedValue(
      jsonResponse(
        { message: 'Solo podés escribir en la historia clínica de un paciente al que atendiste.' },
        403,
      ),
    );
    renderForm({ onSaved });

    await userEvent.type(screen.getByLabelText(/motivo de consulta/i), 'Control');
    await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByText(/paciente al que atendiste/i)).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('solo ofrece cancelar si hay a dónde volver', () => {
    // Suelto en una pantalla, un "Cancelar" que no cancela nada es ruido.
    const { rerender } = renderForm();
    expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument();

    const onCancel = vi.fn();
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <ClinicalEntryForm patientId={PATIENT} onCancel={onCancel} />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });
});
