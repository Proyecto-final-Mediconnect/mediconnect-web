// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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

/** Responde por URL: los turnos y la historia son requests distintos. */
function renderPage(turnos: unknown[]) {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) =>
    Promise.resolve(json(String(input).includes('/appointments/me') ? turnos : [])),
  );

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
});
