import { describe, expect, it } from 'vitest';
import { appointmentTimeline } from './timeline';
import type { Appointment } from '../types/appointment';

const NOW = new Date('2026-10-22T15:00:00Z');

const BASE: Appointment = {
  id: 't',
  scheduledAt: '2026-10-28T13:30:00.000Z',
  date: '2026-10-28',
  startTime: '10:30',
  durationMinutes: 30,
  price: 15000,
  currency: 'ARS',
  status: 'CONFIRMADO',
  professional: null,
  patient: null,
  createdAt: '2026-10-21T21:35:00.000Z',
};

const titulos = (a: Appointment, pago: Parameters<typeof appointmentTimeline>[1] = null) =>
  appointmentTimeline(a, pago, NOW).map((p) => p.title);

describe('appointmentTimeline (ENG-178)', () => {
  it('un turno pagado: reserva, pago, confirmado y la consulta que viene', () => {
    const pasos = titulos(BASE);
    expect(pasos).toHaveLength(4);
    expect(pasos[0]).toBe('Reservaste el turno');
    expect(pasos[1]).toMatch(/^Pagaste \$\s15\.000 con MercadoPago$/);
    expect(pasos.slice(2)).toEqual(['Quedó confirmado', 'Consulta']);
  });

  it('la reserva lleva la fecha en hora argentina', () => {
    expect(appointmentTimeline(BASE, null, NOW)[0].when).toBe('21 de octubre · 18:35');
  });

  it('sin pagar: falta el pago y no está confirmado', () => {
    expect(titulos({ ...BASE, status: 'RESERVADO_SIN_PAGAR' })).toEqual([
      'Reservaste el turno',
      'Falta pagarlo para confirmarlo',
      'Consulta',
    ]);
  });

  it('reprogramado y cancelado con reembolso', () => {
    expect(
      titulos(
        {
          ...BASE,
          status: 'CANCELADO',
          rescheduledAt: '2026-10-22T12:00:00.000Z',
          cancelledAt: '2026-10-22T13:00:00.000Z',
        },
        { appointmentId: 't', status: 'REEMBOLSADO', appointmentStatus: 'CANCELADO' },
      ),
    ).toEqual([
      'Reservaste el turno',
      'Te devolvimos el pago',
      'Lo reprogramaste',
      'Se canceló el turno',
    ]);
  });

  it('liberado por falta de pago', () => {
    expect(titulos({ ...BASE, status: 'LIBERADO' })).toContain(
      'Se liberó el horario porque no se pagó a tiempo',
    );
  });

  it('completado', () => {
    expect(titulos({ ...BASE, status: 'COMPLETADO' })).toContain('Tuviste la consulta');
  });
});
