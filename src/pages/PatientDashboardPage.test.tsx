// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { PatientDashboardPage } from './PatientDashboardPage';
import {
  jsonResponse,
  mockApi,
  NOW,
  PATIENT_SESSION,
  renderWithRouter,
  UPCOMING,
} from '../features/appointments/testing/appointmentsMock';

describe('Panel del paciente', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
    const api = mockApi({
      session: () => jsonResponse(PATIENT_SESSION),
      mine: () => jsonResponse([UPCOMING]),
    });
    // El perfil y el MediPass propios no hacen a este caso. Van antes que
    // "/me", que también los matchea.
    const base = api.getMockImplementation()!;
    api.mockImplementation((input, init) =>
      /\/(patients|medipass)\/me/.test(String(input))
        ? Promise.resolve(jsonResponse({}, 404))
        : base(input, init),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('al paciente, el turno sin pagar le ofrece pagarlo', async () => {
    renderWithRouter(<PatientDashboardPage />);

    expect(await screen.findByRole('link', { name: 'Pagar la consulta' })).toHaveAttribute(
      'href',
      `/turnos/${UPCOMING.id}/pago`,
    );
  });
});
