import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { formatPrice } from '../appointments/lib/weeks';
import {
  aclaraciones,
  bloque,
  cabecera,
  documento,
  dosColumnas,
  indicadores,
  rangoLegible,
  tablaDetalle,
} from '../../shared/lib/pdf/hoja';
import type { PatientSummary } from './api';

/**
 * El PDF de "Tu resumen" (ENG-198, ENG-231): consultas, pagos y accesos a la
 * información del paciente en el período, con el detalle de cada cosa.
 */
export function summaryPdf({
  datos,
  periodo,
  persona,
  ahora,
}: {
  datos: PatientSummary;
  /** "Últimos 30 días". */
  periodo: string;
  persona?: string;
  ahora?: Date;
}): TDocumentDefinitions {
  const { consultas, pagos, accesos, currency } = datos;
  const plata = (n: number) => formatPrice(n, currency);

  return documento({
    titulo: 'Resumen de tu actividad',
    ahora,
    contenido: [
      cabecera({
        titulo: 'Resumen de tu actividad',
        persona,
        derecha: [periodo, rangoLegible(datos.from, datos.to)],
      }),
      indicadores([
        {
          etiqueta: 'Consultas realizadas',
          valor: String(consultas.realizadas),
          apagado: consultas.realizadas === 0,
          detalle:
            consultas.profesionales === 1
              ? 'Con 1 profesional'
              : `Con ${consultas.profesionales} profesionales`,
        },
        {
          etiqueta: 'Pagaste',
          valor: plata(pagos.pagado),
          apagado: pagos.pagado === 0,
          detalle: pagos.turnos === 1 ? 'Por 1 turno' : `Por ${pagos.turnos} turnos`,
        },
        {
          etiqueta: 'Te reembolsaron',
          valor: plata(pagos.reembolsado),
          apagado: pagos.reembolsado === 0,
          detalle: 'Por turnos cancelados',
        },
        {
          etiqueta: 'Accesos a tu información',
          valor: String(accesos.total),
          apagado: accesos.total === 0,
          detalle: `${accesos.medipass} al MediPass · ${accesos.historiaClinica} a tu historia`,
        },
      ]),
      dosColumnas(
        bloque(
          'Pagos',
          tablaDetalle([
            { concepto: 'Pagado', valor: plata(pagos.pagado) },
            { concepto: 'Reembolsado', valor: `− ${plata(pagos.reembolsado)}` },
            { concepto: 'Total neto', valor: plata(pagos.neto), destacado: true },
            { concepto: 'Turnos pagados', valor: String(pagos.turnos) },
            { concepto: 'De esos, todavía por venir', valor: String(pagos.porVenir) },
          ]),
        ),
        bloque(
          'Consultas y accesos',
          tablaDetalle([
            { concepto: 'Consultas realizadas', valor: String(consultas.realizadas) },
            { concepto: 'Profesionales distintos', valor: String(consultas.profesionales) },
            { concepto: 'Accesos a tu historia clínica', valor: String(accesos.historiaClinica) },
            { concepto: 'Accesos a tu MediPass', valor: String(accesos.medipass) },
            { concepto: 'Accesos en total', valor: String(accesos.total), destacado: true },
          ]),
        ),
      ),
      aclaraciones([
        'Los turnos se pagan al reservarlos: lo pagado incluye turnos que todavía no pasaron. Los reembolsos son por turnos cancelados, según la política de cada profesional.',
        'Cada acceso a tu historia clínica y a tu MediPass queda registrado y no se puede borrar. El detalle (quién, cuándo y por qué) está en MediConnect.',
      ]),
    ],
  });
}
