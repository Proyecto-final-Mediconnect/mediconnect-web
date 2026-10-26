// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyAppointments } from './MyAppointments';
import {
  CANCELLED,
  jsonResponse,
  LATER,
  mockApi,
  NOW,
  PAST,
  PRO_SESSION,
  renderWithRouter,
  UPCOMING,
} from '../testing/appointmentsMock';

function renderMyAppointments() {
  return renderWithRouter(<MyAppointments />);
}

function user() {
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
}

describe('MyAppointments (ENG-178)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('destaca el próximo turno, lista los demás próximos y agrupa la historia por mes', async () => {
    mockApi({ mine: () => jsonResponse([PAST, CANCELLED, LATER, UPCOMING]) });
    renderMyAppointments();

    const proximo = await screen.findByRole('region', { name: 'Próximo turno' });
    expect(within(proximo).getByText(/18 de agosto de 2026 · 10:00/)).toBeInTheDocument();

    const proximos = screen.getByRole('region', { name: 'Próximos' });
    expect(within(proximos).getAllByRole('listitem')).toHaveLength(1);

    // La historia va del más reciente al más viejo, un grupo por mes.
    const meses = screen
      .getAllByRole('heading', { level: 2 })
      .map((h) => h.textContent)
      .filter((t) => /2026/.test(t ?? ''));
    expect(meses).toEqual(['Agosto 2026', 'Julio 2026']);
  });

  it('cada turno muestra la contraparte, la hora y el estado', async () => {
    mockApi({ mine: () => jsonResponse([LATER, UPCOMING]) });
    renderMyAppointments();

    const proximos = await screen.findByRole('region', { name: 'Próximos' });
    expect(within(proximos).getByText('Ana Médica')).toBeInTheDocument();
    expect(within(proximos).getByText(/10:00 · 30 min/)).toBeInTheDocument();
    expect(within(proximos).getByText('Confirmado')).toBeInTheDocument();
  });

  it('el profesional ve al paciente y busca por paciente', async () => {
    mockApi({ session: () => jsonResponse(PRO_SESSION) });
    renderMyAppointments();

    expect((await screen.findAllByText(/Juan Paciente/)).length).toBeGreaterThan(0);
    expect(screen.getByRole('searchbox', { name: 'Buscar por paciente' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /nuevo turno/i })).not.toBeInTheDocument();
  });

  it('cada turno abre su detalle', async () => {
    mockApi();
    renderMyAppointments();

    const links = await screen.findAllByRole('link', { name: 'Ver el turno con Ana Médica' });
    expect(links.map((l) => l.getAttribute('href'))).toEqual(
      expect.arrayContaining([`/turnos/${UPCOMING.id}`, `/turnos/${PAST.id}`]),
    );
  });

  it('el turno sin pagar ofrece pagar', async () => {
    mockApi({ mine: () => jsonResponse([UPCOMING]) });
    renderMyAppointments();

    expect(await screen.findByRole('link', { name: 'Pagar' })).toHaveAttribute(
      'href',
      `/turnos/${UPCOMING.id}/pago`,
    );
  });

  it('busca por nombre y, sin resultados, ofrece limpiar los filtros', async () => {
    const u = user();
    mockApi();
    renderMyAppointments();

    await u.type(await screen.findByRole('searchbox'), 'zzz');

    expect(screen.getByText('No hay turnos con esos filtros')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(await screen.findByRole('region', { name: 'Próximo turno' })).toBeInTheDocument();
  });

  it('filtra por estado', async () => {
    const u = user();
    mockApi({ mine: () => jsonResponse([PAST, UPCOMING]) });
    renderMyAppointments();

    await u.selectOptions(await screen.findByRole('combobox', { name: 'Estado' }), 'completados');

    expect(screen.queryByRole('region', { name: 'Próximo turno' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Agosto 2026' })).toBeInTheDocument();
  });

  it('cancelar pide confirmación en un modal y después manda el PATCH', async () => {
    const u = user();
    const fetchMock = mockApi({ mine: () => jsonResponse([UPCOMING]) });
    renderMyAppointments();

    await u.click(await screen.findByRole('button', { name: /cancelar turno/i }));
    const modal = screen.getByRole('dialog', { name: '¿Cancelar el turno?' });
    expect(within(modal).getByText(/18 de agosto de 2026 a las 10:00/)).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([, init]) => (init as RequestInit | undefined)?.method === 'PATCH',
      ),
    ).toBe(false);

    await u.click(within(modal).getByRole('button', { name: 'Sí, cancelar' }));
    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(
        ([, init]) => (init as RequestInit | undefined)?.method === 'PATCH',
      );
      expect(String(patch?.[0])).toContain(`/appointments/${UPCOMING.id}/cancel`);
    });
  });

  it('"Mantener el turno" cierra el modal sin cancelar', async () => {
    const u = user();
    const fetchMock = mockApi({ mine: () => jsonResponse([UPCOMING]) });
    renderMyAppointments();

    await u.click(await screen.findByRole('button', { name: /cancelar turno/i }));
    await u.click(screen.getByRole('button', { name: 'Mantener el turno' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(
        ([, init]) => (init as RequestInit | undefined)?.method === 'PATCH',
      ),
    ).toBe(false);
  });

  it('el profesional no cancela el turno de su paciente', async () => {
    mockApi({ session: () => jsonResponse(PRO_SESSION), mine: () => jsonResponse([UPCOMING]) });
    renderMyAppointments();

    await screen.findByRole('region', { name: 'Próximo turno' });
    expect(screen.queryByRole('button', { name: /cancelar/i })).not.toBeInTheDocument();
  });

  it('sin turnos lo dice y ofrece buscar un profesional', async () => {
    mockApi({ mine: () => jsonResponse([]) });
    renderMyAppointments();

    expect(await screen.findByText('Todavía no tenés turnos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Buscar profesional' })).toHaveAttribute(
      'href',
      '/buscar',
    );
  });

  it('si la lista falla muestra el mensaje del backend (un 4xx no se reintenta)', async () => {
    mockApi({
      mine: () => jsonResponse({ statusCode: 403, message: 'No tenés permiso.' }, 403),
    });
    renderMyAppointments();

    expect(await screen.findByRole('alert')).toHaveTextContent('No tenés permiso.');
  });

  describe('en pantalla ancha', () => {
    beforeEach(() => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn().mockImplementation((query: string) => ({
          matches: true,
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      );
    });

    afterEach(() => vi.unstubAllGlobals());

    it('tocar un turno abre su detalle en un panel lateral, que se cierra con la ✕', async () => {
      const u = user();
      mockApi({ mine: () => jsonResponse([PAST, UPCOMING]) });
      renderWithRouter(<MyAppointments />, '/mis-turnos', '/mis-turnos');

      const fila = (
        await screen.findAllByRole('link', { name: 'Ver el turno con Ana Médica' })
      ).find((l) => l.getAttribute('href') === `/mis-turnos?turno=${PAST.id}`);
      await u.click(fila!);

      const panel = await screen.findByRole('dialog', { name: 'Detalle del turno' });
      expect(within(panel).getByText('Tuviste la consulta')).toBeInTheDocument();

      await u.click(within(panel).getByRole('button', { name: 'Cerrar' }));
      expect(screen.queryByRole('dialog', { name: 'Detalle del turno' })).not.toBeInTheDocument();
    });

    it('sin un turno elegido no abre nada: la lista ocupa todo', async () => {
      mockApi({ mine: () => jsonResponse([PAST, UPCOMING]) });
      renderWithRouter(<MyAppointments />, '/mis-turnos', '/mis-turnos');

      await screen.findByRole('region', { name: 'Próximo turno' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('reembolso al cancelar (ENG-171, ENG-65)', () => {
    const PROFILE = {
      id: UPCOMING.professional.id,
      firstName: 'Ana',
      lastName: 'Médica',
      photoUrl: null,
      bio: null,
      specialties: [],
      education: [],
      price: 15000,
      currency: 'ARS',
      cancellationPolicy: { hoursFullRefund: 24, hoursPartialRefund: 6, partialRefundPercent: 50 },
    };
    /** Pagado, mañana a las 10:00: faltan 26 h. */
    const PAID = { ...UPCOMING, status: 'CONFIRMADO' };

    async function abrirModal(
      extra: Parameters<typeof mockApi>[0] = {},
      turnos: unknown[] = [PAID],
    ) {
      const u = user();
      mockApi({ mine: () => jsonResponse(turnos), profile: () => jsonResponse(PROFILE), ...extra });
      renderMyAppointments();
      await u.click(await screen.findByRole('button', { name: /cancelar turno/i }));
      return u;
    }

    it('sin la cotización de ENG-65 cuenta con la política del perfil y no promete devolución automática', async () => {
      await abrirModal();

      expect(await screen.findByText(/te corresponde la devolución total/)).toHaveTextContent(
        /15\.000.*se gestiona aparte/,
      );
    });

    it('con la cotización del backend usa la política guardada en el turno', async () => {
      await abrirModal({ quote: () => jsonResponse({ percent: 30, amount: 4500, status: null }) });

      expect(await screen.findByText(/te corresponde el 30 %/)).toHaveTextContent(
        /4\.500.*Te lo devolvemos por MercadoPago/,
      );
    });

    it('un turno sin pagar no habla de devolución', async () => {
      await abrirModal({}, [UPCOMING]);

      expect(screen.getByRole('dialog')).not.toHaveTextContent(/devolución/);
    });

    it('después de cancelar dice cómo salió la devolución, hasta que se cierra', async () => {
      const u = await abrirModal({
        quote: () => jsonResponse({ percent: 100, amount: 15000, status: null }),
        cancel: () =>
          jsonResponse({
            ...PAID,
            status: 'CANCELADO',
            refund: { percent: 100, amount: 15000, status: 'PROCESADO' },
          }),
      });

      await u.click(screen.getByRole('button', { name: 'Sí, cancelar' }));

      expect(
        await screen.findByText(/Te devolvemos .*15\.000 por MercadoPago/),
      ).toBeInTheDocument();
      await u.click(screen.getByRole('button', { name: 'Entendido' }));
      expect(screen.queryByText(/Te devolvemos/)).not.toBeInTheDocument();
    });
  });
});
