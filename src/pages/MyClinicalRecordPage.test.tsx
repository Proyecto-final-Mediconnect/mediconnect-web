// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { MyClinicalRecordPage } from './MyClinicalRecordPage';

const PATIENT = '11111111-1111-4111-8111-111111111111';

// Mock parcial: `DashboardLayout` también usa `useLogout` de este módulo.
vi.mock('../features/auth/hooks/useSession', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../features/auth/hooks/useSession')>()),
  useSession: () => ({
    user: {
      id: PATIENT,
      email: 'paciente@mediconnect.test',
      role: 'PACIENTE',
      firstName: 'Juan',
      lastName: 'Pérez',
    },
    isLoading: false,
    isAuthenticated: true,
  }),
}));

function entry(overrides: Record<string, unknown> = {}) {
  return {
    id: 'e1',
    patientId: PATIENT,
    professionalId: 'q1',
    professional: { firstName: 'Ana', lastName: 'García' },
    sequenceNumber: 1,
    entryType: 'CONSULTA',
    fhirResourceType: 'ClinicalImpression',
    content: {
      resourceType: 'ClinicalImpression',
      description: 'Dolor lumbar de 3 días',
    },
    consultationId: null,
    correctsEntryId: null,
    createdAt: '2026-08-20T12:00:00.000Z',
    contentHash: 'a'.repeat(64),
    previousHash: '0'.repeat(64),
    ...overrides,
  };
}

function renderPage(entries: unknown[]) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(entries), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <MyClinicalRecordPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('MyClinicalRecordPage (ENG-59)', () => {
  it('pide la historia del paciente de la sesión, no de la URL', async () => {
    renderPage([entry()]);

    await screen.findByText(/dolor lumbar/i);

    const url = vi.mocked(globalThis.fetch).mock.calls[0][0] as string;
    expect(url).toContain(`/patients/${PATIENT}/clinical-record`);
  });

  it('muestra fecha, profesional, tipo y contenido de cada entrada', async () => {
    // Es el segundo criterio de aceptación, entero.
    renderPage([entry()]);

    const item = (await screen.findByText(/dolor lumbar/i)).closest('article');
    expect(item).not.toBeNull();

    const card = within(item as HTMLElement);
    expect(card.getByText(/20 de agosto de 2026/)).toBeInTheDocument();
    // Con nombre y todo: la tarjeta dice quién firmó el asiento, no solo que
    // alguien lo hizo. Ley 26.529 art. 15.
    expect(card.getByText(/firmada por Ana García/i)).toBeInTheDocument();
    expect(card.getByText('CONSULTA')).toBeInTheDocument();
    // El motivo es el titular de la tarjeta: es lo que resume la consulta.
    expect(card.getByRole('heading', { name: 'Dolor lumbar de 3 días' })).toBeInTheDocument();
  });

  it('lista de la más reciente a la más vieja', async () => {
    // El backend devuelve la cadena hacia adelante; quien abre su HC busca lo
    // último que le pasó.
    renderPage([
      entry({ id: 'vieja', sequenceNumber: 1, content: { description: 'La primera' } }),
      entry({ id: 'nueva', sequenceNumber: 2, content: { description: 'La última' } }),
    ]);

    await screen.findByText('La última');

    const textos = screen.getAllByText(/^La (primera|última)$/).map((n) => n.textContent);
    expect(textos).toEqual(['La última', 'La primera']);
  });

  it('no ofrece el formulario: el paciente lee su historia, no la escribe', async () => {
    renderPage([entry()]);

    await screen.findByText(/dolor lumbar/i);

    expect(screen.queryByLabelText(/motivo de consulta/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /guardar en la historia/i }),
    ).not.toBeInTheDocument();
  });

  it('sigue mostrando la entrada si el profesional no tiene perfil cargado', async () => {
    // Es una historia clínica: perder el nombre es mejor que perder el registro.
    renderPage([entry({ professional: null })]);

    expect(await screen.findByText('Dolor lumbar de 3 días')).toBeInTheDocument();
  });

  it('una historia vacía se explica, no queda en blanco', async () => {
    renderPage([]);

    expect(
      await screen.findByText(/todavía no hay entradas en tu historia clínica/i),
    ).toBeInTheDocument();
  });
});
