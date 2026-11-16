import { useEffect } from 'react';
import { formatLongDate } from '../../appointments/lib/myAppointments';
import { formatPrice } from '../../appointments/lib/weeks';
import type { Appointment } from '../../appointments/types/appointment';
import {
  ReportBlock,
  ReportKpi,
  ReportSheet,
  ReportTable,
} from '../../../shared/ui/PrintableReport';
import { paymentMethodLabel } from '../lib/receipt';
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

/** "15 de noviembre de 2026 · 12:04": en un comprobante el año va siempre. */
function acreditadoEl(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const instante = new Date(iso);
  if (Number.isNaN(instante.getTime())) return null;
  return `${FECHA.format(instante)} · ${HORA.format(instante)}`;
}

const nombre = (p: Appointment['patient']) => (p ? `${p.firstName} ${p.lastName}` : undefined);

/**
 * La hoja en PDF del comprobante: la misma hoja de los reportes (logo, título,
 * pie con cuándo se generó), con el turno y el pago. El comprobante oficial lo
 * emite MercadoPago; esta hoja lleva su número de operación para cruzarlos.
 */
export function ReceiptSheet({
  receipt,
  confirmedAt,
  appointment,
}: {
  receipt: PaymentReceipt;
  confirmedAt: string | null | undefined;
  appointment: Appointment;
}) {
  const acreditado = acreditadoEl(confirmedAt);
  const fechaPago =
    confirmedAt && !Number.isNaN(Date.parse(confirmedAt)) ? new Date(confirmedAt) : null;

  // El navegador sugiere el título de la pestaña como nombre del PDF.
  useEffect(() => {
    const anterior = document.title;
    document.title = `Comprobante MediConnect ${appointment.date}`;
    return () => {
      document.title = anterior;
    };
  }, [appointment.date]);
  const profesional = nombre(appointment.professional) ?? 'No disponible';
  const importe = formatPrice(receipt.amount, receipt.currency);
  const medio = paymentMethodLabel(receipt.method);

  return (
    <ReportSheet
      titulo="Comprobante de pago"
      persona={nombre(appointment.patient)}
      periodo="Pago acreditado"
      rango={acreditado ?? 'Acreditado por MercadoPago'}
      pie={
        <p>
          El comprobante oficial del pago lo emite <b>MercadoPago</b>. El número de operación de
          esta hoja es el mismo que figura en él.
        </p>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        <ReportKpi etiqueta="Importe" valor={importe} />
        <ReportKpi etiqueta="Profesional" valor={profesional} detalle="Videoconsulta" />
        <ReportKpi
          etiqueta="Turno"
          valor={appointment.startTime}
          detalle={formatLongDate(appointment.date)}
        />
      </div>

      <div className="grid grid-cols-2 gap-8">
        <ReportBlock titulo="El turno">
          <ReportTable
            filas={[
              { concepto: 'Profesional', valor: profesional },
              { concepto: 'Fecha', valor: formatLongDate(appointment.date) },
              { concepto: 'Hora', valor: appointment.startTime },
              { concepto: 'Duración', valor: `${appointment.durationMinutes} min` },
              { concepto: 'Modalidad', valor: 'Videoconsulta' },
            ]}
          />
        </ReportBlock>
        <ReportBlock titulo="El pago">
          <ReportTable
            filas={[
              { concepto: 'Medio', valor: medio },
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
            ]}
          />
        </ReportBlock>
      </div>
    </ReportSheet>
  );
}
