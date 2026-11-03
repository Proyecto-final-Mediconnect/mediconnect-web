import { describe, expect, it } from 'vitest';
import { appointmentTimeline, refundStep } from './timeline';
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

  it('visto por el profesional, los pasos hablan del paciente', () => {
    const pasos = appointmentTimeline(
      { ...BASE, status: 'COMPLETADO', rescheduledAt: '2026-10-22T12:00:00.000Z' },
      null,
      NOW,
      'PROFESIONAL',
    ).map((p) => p.title);
    expect(pasos).toEqual([
      'El paciente reservó el turno',
      'Pago acreditado',
      'Se reprogramó el turno',
      'Quedó confirmado',
      'Se realizó la consulta',
    ]);
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

  describe('estado del reembolso (ENG-174)', () => {
    const CANCELADO: Appointment = {
      ...BASE,
      status: 'CANCELADO',
      cancelledAt: '2026-10-22T13:00:00.000Z',
    };
    const PAGO_APROBADO = {
      appointmentId: 't',
      status: 'APROBADO',
      appointmentStatus: 'CANCELADO',
    } as const;

    it('un reembolso parcial acreditado dice cuánto se devolvió, después de cancelar', () => {
      const pasos = titulos(
        { ...CANCELADO, refundState: { amount: 7500, status: 'PROCESADO' } },
        PAGO_APROBADO,
      );
      expect(pasos[1]).toMatch(/^Pagaste \$\s15\.000/);
      expect(pasos[2]).toBe('Se canceló el turno');
      expect(pasos[3]).toMatch(/^Te devolvimos \$\s7\.500$/);
    });

    it('uno pendiente se ve en curso, sin decir que no se devolvió nada', () => {
      const [paso] = appointmentTimeline(
        { ...CANCELADO, refundState: { amount: 15000, status: 'PENDIENTE' } },
        PAGO_APROBADO,
        NOW,
      ).slice(-1);
      expect(paso.title).toMatch(/^Reembolso de \$\s15\.000 en curso$/);
      expect(paso.tone).toBe('current');
    });

    // Con uno acreditado y otro rechazado el backend manda lo acreditado como
    // monto y RECHAZADO como estado: el texto no puede afirmar esa cifra.
    it('uno rechazado se ve mal, sin monto y con qué hacer', () => {
      const [paso] = appointmentTimeline(
        { ...CANCELADO, refundState: { amount: 7500, status: 'RECHAZADO' } },
        PAGO_APROBADO,
        NOW,
      ).slice(-1);
      expect(paso.title).toBe('Hubo un problema con el reembolso. Escribinos y lo revisamos');
      expect(paso.title).not.toMatch(/\$/);
      expect(paso.tone).toBe('bad');
    });

    it('uno total con el pago ya reembolsado no repite "te devolvimos el pago"', () => {
      const pasos = titulos(
        { ...CANCELADO, refundState: { amount: 15000, status: 'PROCESADO' } },
        { ...PAGO_APROBADO, status: 'REEMBOLSADO' },
      );
      expect(pasos).not.toContain('Te devolvimos el pago');
      expect(pasos.at(-1)).toMatch(/^Te devolvimos \$\s15\.000$/);
    });

    it('un liberado con reembolso lo muestra después de liberar el horario', () => {
      const pasos = titulos(
        { ...BASE, status: 'LIBERADO', refundState: { amount: 15000, status: 'PROCESADO' } },
        { ...PAGO_APROBADO, appointmentStatus: 'LIBERADO' },
      );
      expect(pasos.at(-2)).toBe('Se liberó el horario porque no se pagó a tiempo');
      expect(pasos.at(-1)).toMatch(/^Te devolvimos \$\s15\.000$/);
    });

    // El backend no le manda el reembolso al profesional; si algún día llegara,
    // no se le muestra un texto pensado para el paciente.
    it('el profesional no ve el paso del reembolso', () => {
      const pasos = appointmentTimeline(
        { ...CANCELADO, refundState: { amount: 7500, status: 'PROCESADO' } },
        PAGO_APROBADO,
        NOW,
        'PROFESIONAL',
      ).map((p) => p.key);
      expect(pasos).not.toContain('reembolso');
    });

    it('un estado que no conoce no muestra nada', () => {
      const refundState = {
        amount: 7500,
        status: 'NUEVO',
      } as unknown as Appointment['refundState'];
      expect(refundStep({ ...CANCELADO, refundState })).toBeNull();
    });

    it('un cancelado sin pago no muestra nada de reembolso', () => {
      const pasos = titulos({ ...CANCELADO, refundState: null });
      expect(pasos.join(' ')).not.toMatch(/reembolso|devolvi/i);
    });

    it('con un backend anterior (sin el campo) se ve como antes', () => {
      expect('refundState' in CANCELADO).toBe(false);
      expect(titulos(CANCELADO, { ...PAGO_APROBADO, status: 'REEMBOLSADO' })).toContain(
        'Te devolvimos el pago',
      );
    });
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
