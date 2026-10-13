// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CorrectEntryForm } from './CorrectEntryForm';
import type { ClinicalEntry } from '../types/clinicalRecord';

/**
 * El formulario de corrección (ENG-100).
 *
 * Lo que se verifica es qué se le manda al backend y qué NO: la corrección lleva
 * el asiento completo, no lleva el tipo ni a quién corrige —eso va en la URL— y
 * exige el motivo. Cada request que sale de acá deja una fila que no se puede
 * borrar, así que importa igual que en el alta lo que se frena antes de salir.
 */

const PATIENT = '11111111-1111-4111-8111-111111111111';
const ENTRY_ID = '44444444-4444-4444-8444-444444444444';

const entry: ClinicalEntry = {
  id: ENTRY_ID,
  patientId: PATIENT,
  professionalId: 'q1',
  professional: { firstName: 'Ana', lastName: 'García' },
  sequenceNumber: 3,
  entryType: 'CONSULTA',
  fhirResourceType: 'ClinicalImpression',
  content: {
    resourceType: 'ClinicalImpression',
    description: 'Dolor lumbar de 3 días',
    summary: 'Buen estado general',
    finding: [{ item: { concept: { text: 'Lumbalgia mecánica' } } }],
    note: [{ text: 'Reposo relativo' }],
  },
  consultationId: null,
  correctsEntryId: null,
  createdAt: '2026-08-27T12:00:00.000Z',
  contentHash: 'abcd1234'.repeat(8),
  previousHash: '0'.repeat(64),
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

type FetchCall = [RequestInfo, RequestInit?];

function posts(spy: ReturnType<typeof vi.spyOn>): FetchCall[] {
  return (spy.mock.calls as unknown as FetchCall[]).filter(
    (call) => call[1]?.method === 'POST',
  );
}

function lastPostBody(spy: ReturnType<typeof vi.spyOn>): Record<string, unknown> | undefined {
  const post = posts(spy).pop();
  return post?.[1]?.body
    ? (JSON.parse(post[1].body as string) as Record<string, unknown>)
    : undefined;
}

function renderForm(
  props: { entry?: ClinicalEntry; onSaved?: () => void; onCancel?: () => void } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <CorrectEntryForm patientId={PATIENT} entry={entry} {...props} />
    </QueryClientProvider>,
  );
}

const campo = (label: RegExp) => screen.getByLabelText(label);
const guardar = () => screen.getByRole('button', { name: /guardar la corrección/i });

describe('CorrectEntryForm (ENG-100)', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ id: 'correccion' }, 201));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('arranca con el contenido de la entrada original cargado', () => {
    // Es lo que hace que corregir un campo sea corregir un campo, y no reescribir
    // el asiento entero de memoria.
    renderForm();

    expect(campo(/motivo de consulta/i)).toHaveValue('Dolor lumbar de 3 días');
    expect(campo(/evolución y hallazgos/i)).toHaveValue('Buen estado general');
    expect(campo(/diagnóstico/i)).toHaveValue('Lumbalgia mecánica');
    expect(campo(/plan e indicaciones/i)).toHaveValue('Reposo relativo');
  });

  it('el motivo de la corrección arranca vacío', () => {
    // No hay nada que precargar, y un valor por defecto se guardaría tal cual en
    // una fila que no se puede borrar.
    renderForm();

    expect(campo(/qué estás corrigiendo/i)).toHaveValue('');
  });

  it('avisa que la original se conserva', () => {
    renderForm();

    expect(screen.getByText(/se conserva sin cambios/i)).toBeInTheDocument();
  });

  it('no manda nada sin el motivo de la corrección', async () => {
    renderForm();

    await userEvent.click(guardar());

    expect(screen.getByText(/qué se está corrigiendo y por qué/i)).toBeInTheDocument();
    expect(posts(fetchSpy)).toHaveLength(0);
  });

  it('no manda nada si se vació el motivo de consulta', async () => {
    renderForm();
    await userEvent.clear(campo(/motivo de consulta/i));
    await userEvent.type(campo(/qué estás corrigiendo/i), 'El diagnóstico era de otra patología');

    await userEvent.click(guardar());

    expect(screen.getByText(/el motivo es obligatorio/i)).toBeInTheDocument();
    expect(posts(fetchSpy)).toHaveLength(0);
  });

  it('postea a la subruta de correcciones de esa entrada', async () => {
    renderForm();
    await userEvent.type(campo(/qué estás corrigiendo/i), 'El diagnóstico era de otra patología');

    await userEvent.click(guardar());

    await waitFor(() => expect(posts(fetchSpy)).toHaveLength(1));
    expect(String(posts(fetchSpy)[0][0])).toContain(
      `/patients/${PATIENT}/clinical-record/${ENTRY_ID}/corrections`,
    );
  });

  it('manda el asiento completo más el motivo de la corrección', async () => {
    renderForm();
    await userEvent.clear(campo(/diagnóstico/i));
    await userEvent.type(campo(/diagnóstico/i), 'Lumbalgia inflamatoria');
    await userEvent.type(campo(/qué estás corrigiendo/i), 'El diagnóstico era de otra patología');

    await userEvent.click(guardar());

    await waitFor(() => expect(posts(fetchSpy)).toHaveLength(1));
    expect(lastPostBody(fetchSpy)).toEqual({
      reason: 'Dolor lumbar de 3 días',
      findings: 'Buen estado general',
      diagnosis: 'Lumbalgia inflamatoria',
      plan: 'Reposo relativo',
      correctionReason: 'El diagnóstico era de otra patología',
    });
  });

  it('no manda el tipo ni a quién corrige: el backend rechaza el request entero', async () => {
    // El tipo es siempre CORRECCION y a quién corrige va en la URL. El backend
    // corre con `forbidNonWhitelisted`.
    renderForm();
    await userEvent.type(campo(/qué estás corrigiendo/i), 'Error de tipeo');

    await userEvent.click(guardar());

    await waitFor(() => expect(posts(fetchSpy)).toHaveLength(1));
    const body = lastPostBody(fetchSpy) ?? {};
    expect(body).not.toHaveProperty('entryType');
    expect(body).not.toHaveProperty('correctsEntryId');
    expect(body).not.toHaveProperty('consultationId');
  });

  it('omite los campos opcionales vacíos', async () => {
    renderForm();
    await userEvent.clear(campo(/evolución y hallazgos/i));
    await userEvent.clear(campo(/plan e indicaciones/i));
    await userEvent.type(campo(/qué estás corrigiendo/i), 'Sobraban datos');

    await userEvent.click(guardar());

    await waitFor(() => expect(posts(fetchSpy)).toHaveLength(1));
    const body = lastPostBody(fetchSpy) ?? {};
    expect(body).not.toHaveProperty('findings');
    expect(body).not.toHaveProperty('plan');
  });

  it('avisa cuando quedó guardada, para que el diálogo se cierre', async () => {
    const onSaved = vi.fn();
    renderForm({ onSaved });
    await userEvent.type(campo(/qué estás corrigiendo/i), 'Error de tipeo');

    await userEvent.click(guardar());

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  });

  it('el 409 explica que hay que corregir la corrección más reciente', async () => {
    // Sin esta línea el profesional queda con "esa entrada ya tiene una
    // corrección" y sin saber qué hacer.
    fetchSpy.mockResolvedValue(
      jsonResponse({ message: 'Esa entrada ya tiene una corrección.' }, 409),
    );
    renderForm();
    await userEvent.type(campo(/qué estás corrigiendo/i), 'Error de tipeo');

    await userEvent.click(guardar());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /corregí la corrección más reciente/i,
    );
  });

  it('no reintenta solo: una corrección duplicada no se puede borrar', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ message: 'Se cayó.' }, 500));
    renderForm();
    await userEvent.type(campo(/qué estás corrigiendo/i), 'Error de tipeo');

    await userEvent.click(guardar());

    await screen.findByRole('alert');
    expect(posts(fetchSpy)).toHaveLength(1);
  });

  it('una entrada con un recurso que no se reconoce arranca vacía, no bloqueada', async () => {
    // Hay recursos viejos en la base que no son `ClinicalImpression`. La original
    // queda intacta de todos modos: una entrada que no se puede corregir es peor
    // que una que hay que reescribir.
    renderForm({
      entry: {
        ...entry,
        fhirResourceType: 'DiagnosticReport',
        content: { resourceType: 'DiagnosticReport', estudio: 'Radiografía de tórax' },
      },
    });

    expect(campo(/motivo de consulta/i)).toHaveValue('');
    expect(guardar()).toBeEnabled();
  });
});
