// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { PatientClinicalRecordPage } from './PatientClinicalRecordPage';

/**
 * La historia clínica de un paciente vista por su profesional (ENG-58, ENG-60).
 *
 * Lo que sabe SOLO esta pantalla es de quién es la historia que está abriendo:
 * el endpoint de la HC devuelve las entradas y quién las firmó, pero nunca el
 * nombre del titular. Lo resuelve contra `/appointments/me`.
 */

const PACIENTE = '22222222-2222-4222-8222-222222222222';
const PROFESIONAL = '33333333-3333-4333-8333-333333333333';

vi.mock('../features/auth/hooks/useSession', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../features/auth/hooks/useSession')>()),
  useSession: () => ({
    user: {
      id: PROFESIONAL,
      email: 'pro@mediconnect.test',
      role: 'PROFESIONAL',
      firstName: 'Ana',
      lastName: 'García',
    },
    isLoading: false,
    isAuthenticated: true,
  }),
}));

function turno(patientId: string) {
  return {
    id: 'a1',
    scheduledAt: '2026-08-20T13:00:00Z',
    date: '2026-08-20',
    startTime: '10:00',
    durationMinutes: 30,
    price: 18000,
    currency: 'ARS',
    status: 'CONFIRMADO',
    professional: { id: PROFESIONAL, firstName: 'Ana', lastName: 'García' },
    patient: { id: patientId, firstName: 'Julián', lastName: 'Sosa' },
  };
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Responde por URL: los turnos y la historia son requests distintos. El POST
 *  agrega la entrada a la historia, para poder ver que aparece en la lista. */
function renderPage(turnos: unknown[]) {
  let entradas: unknown[] = [];

  fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    if (url.includes('/appointments/me')) return Promise.resolve(json(turnos));

    if ((init?.method ?? 'GET') === 'POST') {
      const creada = {
        id: 'nueva',
        patientId: PACIENTE,
        professionalId: PROFESIONAL,
        professional: { firstName: 'Ana', lastName: 'García' },
        sequenceNumber: entradas.length + 1,
        entryType: 'CONSULTA',
        fhirResourceType: 'ClinicalImpression',
        content: JSON.parse(String(init?.body)),
        consultationId: null,
        correctsEntryId: null,
        createdAt: '2026-08-27T12:00:00.000Z',
        contentHash: 'a'.repeat(64),
        previousHash: '0'.repeat(64),
      };
      // El backend arma el recurso FHIR; acá alcanza con que el motivo se lea.
      creada.content = { description: (creada.content as { reason: string }).reason };
      entradas = [...entradas, creada];
      return Promise.resolve(json(creada));
    }

    return Promise.resolve(json(entradas));
  });

  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/pacientes/${PACIENTE}/historia-clinica`]}>
        <Routes>
          <Route
            path="/pacientes/:patientId/historia-clinica"
            element={<PatientClinicalRecordPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

let fetchSpy: ReturnType<typeof vi.spyOn>;

/** Cuántos POST se dispararon. */
function postCount(): number {
  const calls = fetchSpy.mock.calls as unknown as [RequestInfo, RequestInit?][];
  return calls.filter((call) => call[1]?.method === 'POST').length;
}

async function abrirAlta() {
  await userEvent.click(await screen.findByRole('button', { name: /agregar entrada/i }));
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PatientClinicalRecordPage', () => {
  /**
   * Sin el nombre, un profesional con dos pestañas abiertas no tiene cómo saber
   * cuál es cuál. En un asiento clínico eso es escribirle en la historia
   * equivocada a alguien, y la fila no se puede borrar.
   */
  it('dice de quién es la historia que está abriendo', async () => {
    renderPage([turno(PACIENTE)]);

    expect(await screen.findByRole('heading', { name: 'Julián Sosa' })).toBeInTheDocument();
  });

  it('el diálogo de alta también lo nombra', async () => {
    renderPage([turno(PACIENTE)]);

    await screen.findByRole('heading', { name: 'Julián Sosa' });
    await userEvent.click(screen.getByRole('button', { name: /agregar entrada/i }));

    expect(
      screen.getByText(/se guarda en la historia clínica de julián sosa/i),
    ).toBeInTheDocument();
  });

  /**
   * El turno puede no estar en la lista: el backend deja leer la HC de alguien a
   * quien ya se le escribió una entrada, aunque el turno haya desaparecido.
   * Preferimos la pantalla sin nombre antes que no mostrar la historia.
   */
  it('sin turno en la lista se muestra igual, sin nombre', async () => {
    renderPage([turno('otro-paciente')]);

    expect(await screen.findByText(/cada entrada queda sellada/i)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Julián Sosa' })).not.toBeInTheDocument();
  });

  /**
   * El alta vive en un diálogo, y esa decisión trae comportamiento propio:
   * abrirse, cerrarse al guardar, y —lo más fácil de romper— reabrir limpio.
   */
  describe('alta de una entrada', () => {
    it('la entrada aparece en la lista apenas se guarda', async () => {
      // Es el cuarto criterio de aceptación de ENG-58.
      renderPage([turno(PACIENTE)]);
      await abrirAlta();

      await userEvent.type(screen.getByLabelText(/motivo de consulta/i), 'Dolor lumbar de 3 días');
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

      expect(await screen.findByText('Dolor lumbar de 3 días')).toBeInTheDocument();
    });

    it('el diálogo se cierra al guardar', async () => {
      renderPage([turno(PACIENTE)]);
      await abrirAlta();

      await userEvent.type(screen.getByLabelText(/motivo de consulta/i), 'Control');
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }));

      // La confirmación es la entrada apareciendo en la lista, que es lo que
      // pide el criterio: no hace falta un cartel además.
      await waitFor(() =>
        expect(screen.queryByLabelText(/motivo de consulta/i)).not.toBeInTheDocument(),
      );
    });

    it('al reabrirlo el formulario está vacío y no reclama nada', async () => {
      // Sin esto, el segundo asiento arranca con el texto del primero a la
      // vista: en una historia clínica eso es copiar la consulta anterior sin
      // darse cuenta, y la fila no se puede borrar.
      renderPage([turno(PACIENTE)]);
      await abrirAlta();

      await userEvent.type(screen.getByLabelText(/motivo de consulta/i), 'Control');
      await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
      await waitFor(() =>
        expect(screen.queryByLabelText(/motivo de consulta/i)).not.toBeInTheDocument(),
      );

      await abrirAlta();
      expect(screen.getByLabelText(/motivo de consulta/i)).toHaveValue('');
      expect(screen.queryByText(/el motivo es obligatorio/i)).not.toBeInTheDocument();
    });

    it('se puede cerrar sin guardar', async () => {
      renderPage([turno(PACIENTE)]);
      await abrirAlta();

      await userEvent.type(screen.getByLabelText(/motivo de consulta/i), 'Me arrepentí');
      await userEvent.click(screen.getByRole('button', { name: /cancelar/i }));

      expect(screen.queryByLabelText(/motivo de consulta/i)).not.toBeInTheDocument();
      expect(postCount()).toBe(0);
    });
  });
});
