// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useParams } from 'react-router-dom';
import { AppointmentDetail } from './AppointmentDetail';
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

function Detail() {
  const { appointmentId } = useParams();
  return <AppointmentDetail appointmentId={appointmentId ?? ''} />;
}

function renderDetail(id: string) {
  return renderWithRouter(<Detail />, `/turnos/${id}`, '/turnos/:appointmentId');
}

const ALL = [UPCOMING, LATER, PAST, CANCELLED];

describe('AppointmentDetail (ENG-178)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('muestra con quién, cuándo y cuánto', async () => {
    mockApi({ mine: () => jsonResponse(ALL) });
    renderDetail(LATER.id);

    expect(await screen.findByRole('heading', { name: 'Ana Médica' })).toBeInTheDocument();
    expect(screen.getByText('Lunes 24 de agosto de 2026')).toBeInTheDocument();
    expect(screen.getByText('10:00 hs · 30 min')).toBeInTheDocument();
    expect(screen.getByText('Confirmado')).toBeInTheDocument();
  });

  it('un turno sin pagar ofrece pagarlo y su historia dice que falta el pago', async () => {
    mockApi({
      mine: () => jsonResponse(ALL),
      payment: () =>
        jsonResponse({
          appointmentId: UPCOMING.id,
          status: 'SIN_INICIAR',
          appointmentStatus: 'RESERVADO_SIN_PAGAR',
        }),
    });
    renderDetail(UPCOMING.id);

    expect(await screen.findByRole('link', { name: 'Pagar el turno' })).toHaveAttribute(
      'href',
      `/turnos/${UPCOMING.id}/pago`,
    );
    const historia = screen.getByRole('region', { name: 'Qué pasó' });
    expect(within(historia).getByText('Reservaste el turno')).toBeInTheDocument();
    expect(within(historia).getByText('Falta pagarlo para confirmarlo')).toBeInTheDocument();
  });

  it('un turno pagado cuenta el pago y ofrece reprogramar y cancelar', async () => {
    mockApi({
      mine: () => jsonResponse(ALL),
      payment: () =>
        jsonResponse({
          appointmentId: LATER.id,
          status: 'APROBADO',
          appointmentStatus: 'CONFIRMADO',
          confirmedAt: '2026-08-17T11:00:00.000Z',
        }),
    });
    renderDetail(LATER.id);

    const historia = await screen.findByRole('region', { name: 'Qué pasó' });
    expect(
      await within(historia).findByText(/Pagaste .*15\.000 con MercadoPago/),
    ).toBeInTheDocument();
    expect(within(historia).getByText('17 de agosto · 08:00')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Reprogramar' })).toHaveAttribute(
      'href',
      `/profesionales/${LATER.professional.id}/turnos?reprogramar=${LATER.id}`,
    );
    expect(screen.getByRole('button', { name: 'Cancelar turno' })).toBeInTheDocument();
  });

  it('un turno ya reprogramado no ofrece reprogramar de nuevo', async () => {
    mockApi({
      mine: () => jsonResponse([{ ...LATER, rescheduledAt: '2026-08-16T12:00:00.000Z' }]),
    });
    renderDetail(LATER.id);

    expect(await screen.findByText('Lo reprogramaste')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Reprogramar' })).not.toBeInTheDocument();
    expect(screen.getByText('Este turno ya se reprogramó una vez.')).toBeInTheDocument();
  });

  describe('devolución al cancelar', () => {
    const PROFILE = {
      id: LATER.professional.id,
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
    const conHorario = (scheduledAt: string) => ({ ...LATER, scheduledAt });

    it('confirmado y en plazo dice que devuelven el 100 %', async () => {
      mockApi({ mine: () => jsonResponse([LATER]), profile: () => jsonResponse(PROFILE) });
      renderDetail(LATER.id);

      expect(
        await screen.findByText('Si cancelás ahora, te devolvemos el 100 %.'),
      ).toBeInTheDocument();
    });

    it('confirmado fuera de plazo dice que no hay devolución', async () => {
      // Faltan 3 horas: por debajo de las 6 del tramo parcial.
      const cerca = conHorario('2026-08-17T14:00:00.000Z');
      mockApi({ mine: () => jsonResponse([cerca]), profile: () => jsonResponse(PROFILE) });
      renderDetail(LATER.id);

      expect(await screen.findByText('Si cancelás ahora, no hay devolución.')).toBeInTheDocument();
    });

    it('confirmado en el tramo parcial dice el porcentaje parcial', async () => {
      // Faltan 10 horas: entre 6 y 24.
      const medio = conHorario('2026-08-17T21:00:00.000Z');
      mockApi({ mine: () => jsonResponse([medio]), profile: () => jsonResponse(PROFILE) });
      renderDetail(LATER.id);

      expect(
        await screen.findByText('Si cancelás ahora, te devolvemos el 50 %.'),
      ).toBeInTheDocument();
    });

    it('un turno sin pagar muestra el texto genérico, sin porcentaje', async () => {
      mockApi({ mine: () => jsonResponse(ALL), profile: () => jsonResponse(PROFILE) });
      renderDetail(UPCOMING.id);

      expect(
        await screen.findByText('El horario queda libre para otro paciente.'),
      ).toBeInTheDocument();
      expect(screen.queryByText(/Si cancelás ahora/)).not.toBeInTheDocument();
    });
  });

  describe('reprogramar un turno pagado (ENG-66)', () => {
    const PROFILE = {
      id: LATER.professional.id,
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

    it('con la anticipación de la política ofrece reprogramar', async () => {
      // Faltan 7 días: devolución total.
      mockApi({ mine: () => jsonResponse(ALL), profile: () => jsonResponse(PROFILE) });
      renderDetail(LATER.id);

      expect(await screen.findByRole('link', { name: 'Reprogramar' })).toBeInTheDocument();
    });

    it('con menos anticipación avisa en lugar de ofrecer reprogramar', async () => {
      // Faltan 10 h: la política da sólo el parcial, así que el backend rechaza.
      mockApi({
        mine: () =>
          jsonResponse([
            {
              ...LATER,
              scheduledAt: '2026-08-17T21:00:00.000Z',
              date: '2026-08-17',
              startTime: '18:00',
            },
          ]),
        profile: () => jsonResponse(PROFILE),
      });
      renderDetail(LATER.id);

      expect(await screen.findByText(/ya no se puede reprogramar/)).toHaveTextContent(/24 horas/);
      expect(screen.queryByRole('link', { name: 'Reprogramar' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancelar turno' })).toBeInTheDocument();
    });
  });

  it('cancelar abre el modal', async () => {
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockApi({ mine: () => jsonResponse(ALL) });
    renderDetail(LATER.id);

    await u.click(await screen.findByRole('button', { name: 'Cancelar turno' }));

    expect(screen.getByRole('dialog', { name: '¿Cancelar el turno?' })).toBeInTheDocument();
  });

  it('un turno que ya pasó ofrece volver a reservar con el mismo profesional', async () => {
    mockApi({ mine: () => jsonResponse(ALL) });
    renderDetail(PAST.id);

    expect(await screen.findByRole('link', { name: 'Volver a reservar con Ana' })).toHaveAttribute(
      'href',
      `/profesionales/${PAST.professional.id}/turnos`,
    );
    expect(screen.getByText('Tuviste la consulta')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancelar turno' })).not.toBeInTheDocument();
  });

  it('un turno cancelado lo cuenta con la fecha', async () => {
    mockApi({ mine: () => jsonResponse(ALL) });
    renderDetail(CANCELLED.id);

    expect(await screen.findByText('Se canceló el turno')).toBeInTheDocument();
    expect(screen.getByText('18 de julio · 12:00')).toBeInTheDocument();
  });

  it('el profesional ve al paciente y el acceso a su historia clínica', async () => {
    mockApi({ session: () => jsonResponse(PRO_SESSION), mine: () => jsonResponse(ALL) });
    renderDetail(LATER.id);

    expect(await screen.findByRole('heading', { name: 'Juan Paciente' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Historia clínica' })).toHaveAttribute(
      'href',
      `/pacientes/${LATER.patient.id}/historia-clinica`,
    );
  });

  describe('el profesional cancela un turno (ENG-204)', () => {
    it('pide el motivo, avisa qué le pasa al paciente y lo manda al backend', async () => {
      const fetchSpy = mockApi({
        session: () => jsonResponse(PRO_SESSION),
        mine: () => jsonResponse(ALL),
      });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderDetail(LATER.id);

      await user.click(await screen.findByRole('button', { name: /Cancelar turno/ }));
      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText(/reembolso del 100 %/)).toBeInTheDocument();

      // Sin motivo no se manda nada.
      await user.click(within(dialog).getByRole('button', { name: 'Sí, cancelar el turno' }));
      expect(within(dialog).getByText(/al menos 10 caracteres/)).toBeInTheDocument();
      expect(
        fetchSpy.mock.calls.some(([input]) => String(input).includes('/cancel-by-professional')),
      ).toBe(false);

      await user.type(within(dialog).getByLabelText('Motivo'), '  Tengo un congreso ese día.  ');
      await user.click(within(dialog).getByRole('button', { name: 'Sí, cancelar el turno' }));

      const llamada = fetchSpy.mock.calls.find(([input]) =>
        String(input).includes(`/appointments/${LATER.id}/cancel-by-professional`),
      );
      expect(llamada?.[1]).toEqual(
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ reason: 'Tengo un congreso ese día.' }),
        }),
      );
      expect(await screen.findByText(/Le avisamos a Juan/)).toBeInTheDocument();
    });

    it('si el backend lo rechaza, el diálogo sigue abierto con el motivo', async () => {
      mockApi({
        session: () => jsonResponse(PRO_SESSION),
        mine: () => jsonResponse(ALL),
        proCancel: () => jsonResponse({ message: 'Ese turno ya no está activo.' }, 409),
      });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderDetail(LATER.id);

      await user.click(await screen.findByRole('button', { name: /Cancelar turno/ }));
      const dialog = await screen.findByRole('dialog');
      await user.type(within(dialog).getByLabelText('Motivo'), 'Tengo un congreso ese día.');
      await user.click(within(dialog).getByRole('button', { name: 'Sí, cancelar el turno' }));

      expect(await within(dialog).findByRole('alert')).toHaveTextContent('ya no está activo');
    });

    it('un turno que ya pasó no ofrece cancelar', async () => {
      mockApi({ session: () => jsonResponse(PRO_SESSION), mine: () => jsonResponse(ALL) });
      renderDetail(PAST.id);

      await screen.findByRole('heading', { name: 'Juan Paciente' });
      expect(screen.queryByRole('button', { name: /Cancelar turno/ })).not.toBeInTheDocument();
    });
  });

  describe('turno a reprogramar (ENG-204)', () => {
    const A_REPROGRAMAR = {
      ...LATER,
      status: 'A_REPROGRAMAR',
      cancelledBy: 'PROFESIONAL',
      cancelledAt: '2026-08-17T10:00:00.000Z',
      cancellationReason: 'Tengo un congreso ese día.',
      reprogramDeadline: '2026-08-19T11:00:00.000Z',
    };

    it('el paciente ve quién canceló, el motivo, el plazo y pide el reembolso', async () => {
      const fetchSpy = mockApi({ mine: () => jsonResponse([A_REPROGRAMAR]) });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderDetail(A_REPROGRAMAR.id);

      expect(await screen.findByText('Ana Médica no va a poder atenderte')).toBeInTheDocument();
      expect(screen.getByText(/Tengo un congreso ese día/)).toBeInTheDocument();
      expect(screen.getByText(/automáticamente/)).toBeInTheDocument();
      expect(screen.getByText('A reprogramar')).toBeInTheDocument();
      // No es un turno terminado: no se ofrece "volver a reservar".
      expect(screen.queryByRole('link', { name: /Volver a reservar/ })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Pedir el reembolso del 100 %' }));
      const dialog = await screen.findByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: 'Sí, quiero el reembolso' }));

      const llamada = fetchSpy.mock.calls.find(([input]) =>
        String(input).includes(`/appointments/${A_REPROGRAMAR.id}/full-refund`),
      );
      expect(llamada?.[1]).toEqual(expect.objectContaining({ method: 'PATCH' }));
      expect(await screen.findByText(/Te devolvemos/)).toBeInTheDocument();
    });

    it('el profesional ve que el paciente tiene que elegir, sin botón de reembolso', async () => {
      mockApi({
        session: () => jsonResponse(PRO_SESSION),
        mine: () => jsonResponse([A_REPROGRAMAR]),
      });
      renderDetail(A_REPROGRAMAR.id);

      expect(
        await screen.findByText('Cancelaste este turno. Juan tiene que elegir.'),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Pedir el reembolso del 100 %' }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Cancelar turno/ })).not.toBeInTheDocument();
    });

    it('un turno que canceló el profesional muestra el motivo', async () => {
      mockApi({
        mine: () =>
          jsonResponse([{ ...A_REPROGRAMAR, status: 'CANCELADO', cancelledBy: 'SISTEMA' }]),
      });
      renderDetail(A_REPROGRAMAR.id);

      expect(await screen.findByText(/Motivo de la cancelación/)).toBeInTheDocument();
      expect(screen.getByText('Venció el plazo para elegir otro horario')).toBeInTheDocument();
    });
  });

  describe('no asistió (ENG-189)', () => {
    // Confirmado, empezó hace 20 minutos.
    const EN_CURSO = {
      ...UPCOMING,
      id: '77777777-7777-4777-8777-777777777777',
      scheduledAt: '2026-08-17T10:40:00.000Z',
      date: '2026-08-17',
      status: 'CONFIRMADO',
    };

    it('el profesional lo marca con confirmación', async () => {
      const fetchSpy = mockApi({
        session: () => jsonResponse(PRO_SESSION),
        mine: () => jsonResponse([EN_CURSO]),
      });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderDetail(EN_CURSO.id);

      await user.click(await screen.findByRole('button', { name: 'Marcar como no asistió' }));
      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText(/no se reembolsa/i)).toBeInTheDocument();

      await user.click(within(dialog).getByRole('button', { name: 'Sí, no asistió' }));

      const llamada = fetchSpy.mock.calls.find(([input]) =>
        String(input).includes(`/appointments/${EN_CURSO.id}/no-show`),
      );
      expect(llamada?.[1]).toEqual(expect.objectContaining({ method: 'PATCH' }));
    });

    it('si el backend lo rechaza, el diálogo sigue abierto con el motivo (review de #75)', async () => {
      mockApi({
        session: () => jsonResponse(PRO_SESSION),
        mine: () => jsonResponse([EN_CURSO]),
        noShow: () =>
          jsonResponse(
            { message: 'El paciente entró a la sala, así que no se puede marcar como no asistió.' },
            409,
          ),
      });
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      renderDetail(EN_CURSO.id);

      await user.click(await screen.findByRole('button', { name: 'Marcar como no asistió' }));
      const dialog = await screen.findByRole('dialog');
      await user.click(within(dialog).getByRole('button', { name: 'Sí, no asistió' }));

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        /el paciente entró a la sala/i,
      );
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('el paciente no ve el botón', async () => {
      mockApi({ mine: () => jsonResponse([EN_CURSO]) });
      renderDetail(EN_CURSO.id);

      await screen.findByRole('heading', { name: 'Ana Médica' });
      expect(
        screen.queryByRole('button', { name: 'Marcar como no asistió' }),
      ).not.toBeInTheDocument();
    });
  });

  it('ofrece reseñar un turno todavía confirmado si el backend lo da como pendiente (ENG-190)', async () => {
    const enCurso = {
      ...UPCOMING,
      id: '88888888-8888-4888-8888-888888888888',
      scheduledAt: '2026-08-17T10:30:00.000Z',
      date: '2026-08-17',
      status: 'CONFIRMADO',
    };
    mockApi({
      mine: () => jsonResponse([enCurso]),
      pending: () =>
        jsonResponse([
          {
            appointmentId: enCurso.id,
            scheduledAt: enCurso.scheduledAt,
            professional: { ...enCurso.professional, photoUrl: null },
          },
        ]),
    });
    renderDetail(enCurso.id);

    expect(await screen.findByRole('button', { name: 'Dejar una reseña' })).toBeInTheDocument();
  });

  it('un turno confirmado que no está pendiente no ofrece reseñar', async () => {
    const enCurso = { ...UPCOMING, status: 'CONFIRMADO' };
    mockApi({ mine: () => jsonResponse([enCurso]) });
    renderDetail(enCurso.id);

    await screen.findByRole('heading', { name: 'Ana Médica' });
    expect(screen.queryByRole('button', { name: 'Dejar una reseña' })).not.toBeInTheDocument();
  });

  it('un turno que no está en la lista lo dice y ofrece volver', async () => {
    mockApi({ mine: () => jsonResponse(ALL) });
    renderDetail('no-existe');

    expect(await screen.findByText('No encontramos ese turno')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a mis turnos' })).toBeInTheDocument();
  });
});
