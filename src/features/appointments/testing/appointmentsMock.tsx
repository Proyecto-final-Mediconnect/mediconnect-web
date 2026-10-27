// Datos y API falsos para los tests de "Mis turnos" y del detalle (ENG-178).
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

export const PATIENT_ID = '11111111-1111-4111-8111-111111111111';
export const PRO_ID = '22222222-2222-4222-8222-222222222222';

/** Lunes 17/08/2026 a las 08:00 locales. */
export const NOW = new Date('2026-08-17T11:00:00Z');

export const PATIENT_SESSION = {
  id: PATIENT_ID,
  email: 'paciente@test.com',
  role: 'PACIENTE',
  firstName: 'Juan',
  lastName: 'Paciente',
};

export const PRO_SESSION = {
  id: PRO_ID,
  email: 'pro@test.com',
  role: 'PROFESIONAL',
  firstName: 'Ana',
  lastName: 'Médica',
};

const PARTIES = {
  professional: { id: PRO_ID, firstName: 'Ana', lastName: 'Médica' },
  patient: { id: PATIENT_ID, firstName: 'Juan', lastName: 'Paciente' },
};

/** Mañana 10:00, sin pagar: cancelable. */
export const UPCOMING = {
  id: '33333333-3333-4333-8333-333333333333',
  scheduledAt: '2026-08-18T13:00:00.000Z',
  date: '2026-08-18',
  startTime: '10:00',
  durationMinutes: 30,
  price: 15000,
  currency: 'ARS',
  status: 'RESERVADO_SIN_PAGAR',
  createdAt: '2026-08-17T10:55:00.000Z',
  rescheduledAt: null as string | null,
  ...PARTIES,
};

/** El lunes que viene, pagado. */
export const LATER = {
  ...UPCOMING,
  id: '55555555-5555-4555-8555-555555555555',
  scheduledAt: '2026-08-24T13:00:00.000Z',
  date: '2026-08-24',
  status: 'CONFIRMADO',
};

/** La semana pasada: ya ocurrió. */
export const PAST = {
  ...UPCOMING,
  id: '44444444-4444-4444-8444-444444444444',
  scheduledAt: '2026-08-10T13:00:00.000Z',
  date: '2026-08-10',
  status: 'COMPLETADO',
};

/** Julio, cancelado. */
export const CANCELLED = {
  ...UPCOMING,
  id: '66666666-6666-4666-8666-666666666666',
  scheduledAt: '2026-07-20T13:00:00.000Z',
  date: '2026-07-20',
  status: 'CANCELADO',
  cancelledAt: '2026-07-18T15:00:00.000Z',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export interface ApiHandlers {
  session?: () => Response;
  mine?: () => Response;
  cancel?: () => Response;
  profile?: () => Response;
  quote?: () => Response;
  payment?: () => Response;
}

export function mockApi(handlers: ApiHandlers = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input, init): Promise<Response> => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (method === 'PATCH' && url.includes('/cancel')) {
      return Promise.resolve(
        handlers.cancel?.() ?? jsonResponse({ ...UPCOMING, status: 'CANCELADO' }),
      );
    }
    // Antes que el PATCH: la URL de la cotización también contiene "/cancel".
    if (url.includes('/cancellation-quote')) {
      return Promise.resolve(handlers.quote?.() ?? jsonResponse({}, 404));
    }
    if (url.endsWith('/payment')) {
      return Promise.resolve(handlers.payment?.() ?? jsonResponse({}, 404));
    }
    if (url.includes(`/professionals/${PRO_ID}`)) {
      return Promise.resolve(handlers.profile?.() ?? jsonResponse({}, 404));
    }
    if (url.includes('/appointments/me')) {
      return Promise.resolve(handlers.mine?.() ?? jsonResponse([PAST, UPCOMING]));
    }
    if (url.includes('/me')) {
      return Promise.resolve(handlers.session?.() ?? jsonResponse(PATIENT_SESSION));
    }
    return Promise.resolve(jsonResponse({}, 404));
  });
}

export function renderWithRouter(ui: React.ReactElement, path = '/', route = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={route} element={ui} />
          <Route path="*" element={<p>otra pantalla</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
