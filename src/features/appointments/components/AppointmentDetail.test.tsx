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
    expect(screen.getByRole('button', { name: 'Cancelar el turno' })).toBeInTheDocument();
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

  it('cancelar abre el modal', async () => {
    const u = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    mockApi({ mine: () => jsonResponse(ALL) });
    renderDetail(LATER.id);

    await u.click(await screen.findByRole('button', { name: 'Cancelar el turno' }));

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
    expect(screen.queryByRole('button', { name: 'Cancelar el turno' })).not.toBeInTheDocument();
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
    expect(screen.queryByRole('button', { name: 'Cancelar el turno' })).not.toBeInTheDocument();
  });

  it('un turno que no está en la lista lo dice y ofrece volver', async () => {
    mockApi({ mine: () => jsonResponse(ALL) });
    renderDetail('no-existe');

    expect(await screen.findByText('No encontramos ese turno')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a mis turnos' })).toBeInTheDocument();
  });
});
