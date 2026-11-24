import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { formatLongDate } from '../../appointments/lib/myAppointments';
import { formatPrice } from '../../appointments/lib/weeks';
import type { Appointment } from '../../appointments/types/appointment';
import {
  aclaraciones,
  bloque,
  cabecera,
  documento,
  dosColumnas,
  indicadores,
  tablaDetalle,
} from '../../../shared/lib/pdf/hoja';
import { paymentMethodLabel } from './receipt';
import type { PaymentReceipt } from '../types/payment';

const AR = 'America/Argentina/Buenos_Aires';
const FECHA = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: AR,
});
const HORA = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: AR,
});

function instante(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const fecha = new Date(iso);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

const nombre = (p: Appointment['patient']) => (p ? `${p.firstName} ${p.lastName}` : undefined);

/**
 * El PDF del comprobante de pago (ENG-199, ENG-231): el turno y el pago. El
 * comprobante oficial lo emite MercadoPago; este lleva su número de operación
 * para cruzarlos.
 */
export function receiptPdf({
  receipt,
  confirmedAt,
  appointment,
  ahora,
}: {
  receipt: PaymentReceipt;
  confirmedAt: string | null | undefined;
  appointment: Appointment;
  ahora?: Date;
}): TDocumentDefinitions {
  const fechaPago = instante(confirmedAt);
  const profesional = nombre(appointment.professional) ?? 'No disponible';
  const importe = formatPrice(receipt.amount, receipt.currency);

  return documento({
    titulo: 'Comprobante de pago',
    ahora,
    contenido: [
      cabecera({
        titulo: 'Comprobante de pago',
        persona: nombre(appointment.patient),
        derecha: [
          'Pago acreditado',
          // En un comprobante el año va siempre.
          fechaPago
            ? `${FECHA.format(fechaPago)} · ${HORA.format(fechaPago)}`
            : 'Acreditado por MercadoPago',
        ],
      }),
      indicadores([
        { etiqueta: 'Importe', valor: importe },
        { etiqueta: 'Profesional', valor: profesional, detalle: 'Videoconsulta', chico: true },
        {
          etiqueta: 'Turno',
          valor: appointment.startTime,
          detalle: formatLongDate(appointment.date),
        },
      ]),
      dosColumnas(
        bloque(
          'El turno',
          tablaDetalle([
            { concepto: 'Profesional', valor: profesional },
            { concepto: 'Fecha', valor: formatLongDate(appointment.date) },
            { concepto: 'Hora', valor: appointment.startTime },
            { concepto: 'Duración', valor: `${appointment.durationMinutes} min` },
            { concepto: 'Modalidad', valor: 'Videoconsulta' },
          ]),
        ),
        bloque(
          'El pago',
          tablaDetalle([
            { concepto: 'Medio', valor: paymentMethodLabel(receipt.method) },
            ...(fechaPago
              ? [
                  { concepto: 'Acreditado el', valor: FECHA.format(fechaPago) },
                  { concepto: 'Hora', valor: HORA.format(fechaPago) },
                ]
              : []),
            {
              concepto: 'N.º de operación de MercadoPago',
              valor: receipt.operationId ?? '—',
            },
            { concepto: 'Importe', valor: importe, destacado: true },
          ]),
        ),
      ),
      aclaraciones([
        {
          negrita: 'El comprobante oficial del pago lo emite MercadoPago.',
          resto: ' El número de operación de esta hoja es el mismo que figura en él.',
        },
      ]),
    ],
  });
}
