import type { CanvasElement, Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import {
  ANCHO_UTIL,
  aclaraciones,
  bloque,
  caja,
  cabecera,
  conMargen,
  COLOR,
  documento,
  dosColumnas,
  indicadores,
  MM,
  rangoLegible,
  tablaDetalle,
} from '../../../shared/lib/pdf/hoja';
import { barHeights, formatRate, formatRating, monthShort, plural, rateBase } from './activity';
import type { ProfessionalStats } from '../types';

/**
 * El PDF de "Mi actividad" (ENG-196, ENG-231): los mismos números del panel,
 * ordenados para leerlos en papel o mandarlos, con el detalle de turnos y cómo
 * se calcula cada tasa.
 */
export function activityPdf({
  datos,
  periodo,
  persona,
  ahora,
}: {
  datos: ProfessionalStats;
  /** "Últimos 3 meses". */
  periodo: string;
  persona?: string;
  ahora?: Date;
}): TDocumentDefinitions {
  const { turnos, tasas, resenas, pacientes } = datos;
  const cerrados = turnos.completados + turnos.noAsistio + turnos.cancelados;

  return documento({
    titulo: 'Reporte de actividad',
    ahora,
    contenido: [
      cabecera({
        titulo: 'Reporte de actividad',
        persona,
        derecha: [periodo, rangoLegible(datos.from, datos.to)],
      }),
      indicadores([
        {
          etiqueta: 'Consultas completadas',
          valor: String(turnos.completados),
          apagado: turnos.completados === 0,
          detalle: `${plural(turnos.porVenir, 'turno confirmado', 'turnos confirmados')} por venir`,
        },
        {
          etiqueta: 'Cancelaciones',
          valor: formatRate(tasas.cancelacion),
          apagado: !tasas.cancelacion,
          detalle: tasas.cancelacion
            ? `${rateBase(tasas.cancelacion)} turnos`
            : 'Sin turnos cerrados',
        },
        {
          etiqueta: 'Ausentismo',
          valor: formatRate(tasas.ausentismo),
          apagado: !tasas.ausentismo,
          detalle: tasas.ausentismo
            ? `${rateBase(tasas.ausentismo)} turnos sin el paciente`
            : 'Sin turnos cerrados',
        },
        {
          etiqueta: 'Calificación',
          // Sin estrella: la fuente del PDF no la trae.
          valor: resenas.promedio === null ? '—' : `${formatRating(resenas.promedio)} de 5`,
          apagado: resenas.promedio === null,
          detalle:
            resenas.cantidad === 0
              ? 'Sin reseñas en el período'
              : `${plural(resenas.cantidad, 'reseña')}${
                  resenas.sinResponder > 0 ? ` · ${resenas.sinResponder} sin responder` : ''
                }`,
        },
      ]),
      conMargen(
        bloque('Consultas completadas por mes', barras(datos.consultasPorMes)),
        [0, 18, 0, 0],
      ),
      dosColumnas(
        bloque(
          'Turnos del período',
          tablaDetalle([
            { concepto: 'Consultas completadas', valor: String(turnos.completados) },
            { concepto: 'Turnos sin el paciente', valor: String(turnos.noAsistio) },
            { concepto: 'Turnos cancelados', valor: String(turnos.cancelados) },
            { concepto: 'Turnos cerrados', valor: String(cerrados), destacado: true },
            { concepto: 'Confirmados por venir', valor: String(turnos.porVenir) },
            { concepto: 'Reservas sin pagar liberadas', valor: String(turnos.liberados) },
            // ENG-237: las incidencias propias del profesional (ADR-018, caso 9).
            ...(datos.incidencias
              ? [
                  {
                    concepto: 'Turnos que cancelaste',
                    valor: String(datos.incidencias.cancelaciones),
                  },
                  {
                    concepto: 'Consultas a las que no te conectaste',
                    valor: String(datos.incidencias.ausencias),
                  },
                  {
                    concepto: 'Fallas técnicas informadas',
                    valor: String(datos.incidencias.fallasTecnicas),
                  },
                ]
              : []),
          ]),
        ),
        bloque(
          'Pacientes y reseñas',
          tablaDetalle([
            { concepto: 'Pacientes atendidos', valor: String(pacientes.unicos) },
            { concepto: 'Volvieron más de una vez', valor: String(pacientes.recurrentes) },
            { concepto: 'Reseñas recibidas', valor: String(resenas.cantidad) },
            { concepto: 'Reseñas sin responder', valor: String(resenas.sinResponder) },
            {
              concepto: 'Calificación promedio',
              valor: resenas.promedio === null ? '—' : `${formatRating(resenas.promedio)} de 5`,
              destacado: true,
            },
          ]),
        ),
      ),
      aclaraciones([
        {
          negrita: 'Cancelaciones',
          resto:
            ': turnos cancelados sobre los turnos cerrados (completados, sin el paciente y cancelados). ',
        },
        {
          negrita: 'Ausentismo',
          resto:
            ': turnos en los que el paciente no se presentó sobre los turnos que llegaron a su horario. Sin turnos cerrados, la tasa se muestra con una raya.',
        },
        'La calificación es el promedio de las reseñas publicadas en el período. Solo pueden dejar reseña los pacientes con una consulta completada.',
      ]),
    ],
  });
}

/** Alto del área de las barras. */
const ALTO = 30 * MM;
/** Relleno de la caja de las barras. */
const RELLENO = 12;

/**
 * Las barras por mes: una columna por mes, con el número justo arriba de su
 * barra y el mes abajo. El espacio vacío arriba de cada número alinea todas
 * las barras por la base.
 */
function barras(meses: ProfessionalStats['consultasPorMes']): Content {
  const altos = barHeights(meses.map((m) => m.consultas));
  const anchoColumna = (ANCHO_UTIL - 2 * RELLENO) / Math.max(meses.length, 1);
  const anchoBarra = Math.min(anchoColumna * (meses.length > 6 ? 0.7 : 0.5), 16 * MM);

  return caja(
    {
      columns: meses.map((m, i) => {
        const vacia = m.consultas === 0;
        const alto = vacia ? 1.5 : Math.max((altos[i] / 100) * ALTO, 3);
        const barra: CanvasElement = {
          type: 'rect',
          x: (anchoColumna - anchoBarra) / 2,
          y: 0,
          w: anchoBarra,
          h: alto,
          r: vacia ? 0 : 2,
          color: vacia ? COLOR.line : COLOR.brand,
        };
        return {
          width: anchoColumna,
          stack: [
            {
              text: String(m.consultas),
              fontSize: 8,
              bold: true,
              color: COLOR.brandDeep,
              alignment: 'center',
              margin: [0, ALTO - alto, 0, 3],
            },
            { canvas: [barra] },
            {
              text: monthShort(m.mes),
              fontSize: 7.5,
              color: COLOR.muted,
              alignment: 'center',
              margin: [0, 4, 0, 0],
            },
          ],
        };
      }),
      columnGap: 0,
    },
    RELLENO,
  );
}
