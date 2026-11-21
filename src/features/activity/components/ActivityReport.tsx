import {
  ReportBlock,
  ReportKpi,
  ReportSheet,
  ReportTable,
} from '../../../shared/ui/PrintableReport';
import { rangoLegible } from '../../../shared/lib/printReport';
import {
  barHeights,
  formatRate,
  formatRating,
  monthLong,
  monthShort,
  plural,
  rateBase,
} from '../lib/activity';
import type { ProfessionalStats } from '../types';

/**
 * La hoja en PDF de "Mi actividad" (ENG-196): los mismos números del panel,
 * ordenados para leerlos en papel o mandarlos, con el detalle de turnos y cómo
 * se calcula cada tasa.
 */
export function ActivityReport({
  datos,
  periodo,
  persona,
}: {
  datos: ProfessionalStats;
  periodo: string;
  persona?: string;
}) {
  const { turnos, tasas, resenas, pacientes } = datos;
  const cerrados = turnos.completados + turnos.noAsistio + turnos.cancelados;

  return (
    <ReportSheet
      titulo="Reporte de actividad"
      persona={persona}
      periodo={periodo}
      rango={rangoLegible(datos.from, datos.to)}
      pie={
        <>
          <p>
            <b>Cancelaciones</b>: turnos cancelados sobre los turnos cerrados (completados, sin el
            paciente y cancelados). <b>Ausentismo</b>: turnos en los que el paciente no se presentó
            sobre los turnos que llegaron a su horario. Sin turnos cerrados, la tasa se muestra con
            una raya.
          </p>
          <p>
            La calificación es el promedio de las reseñas publicadas en el período. Solo pueden
            dejar reseña los pacientes con una consulta completada.
          </p>
        </>
      }
    >
      <div className="grid grid-cols-4 gap-3">
        <ReportKpi
          etiqueta="Consultas completadas"
          valor={String(turnos.completados)}
          apagado={turnos.completados === 0}
          detalle={`${plural(turnos.porVenir, 'turno confirmado', 'turnos confirmados')} por venir`}
        />
        <ReportKpi
          etiqueta="Cancelaciones"
          valor={formatRate(tasas.cancelacion)}
          apagado={!tasas.cancelacion}
          detalle={
            tasas.cancelacion ? `${rateBase(tasas.cancelacion)} turnos` : 'Sin turnos cerrados'
          }
        />
        <ReportKpi
          etiqueta="Ausentismo"
          valor={formatRate(tasas.ausentismo)}
          apagado={!tasas.ausentismo}
          detalle={
            tasas.ausentismo
              ? `${rateBase(tasas.ausentismo)} turnos sin el paciente`
              : 'Sin turnos cerrados'
          }
        />
        <ReportKpi
          etiqueta="Calificación"
          valor={resenas.promedio === null ? '—' : `${formatRating(resenas.promedio)} ★`}
          apagado={resenas.promedio === null}
          detalle={
            resenas.cantidad === 0
              ? 'Sin reseñas en el período'
              : `${plural(resenas.cantidad, 'reseña')}${
                  resenas.sinResponder > 0 ? ` · ${resenas.sinResponder} sin responder` : ''
                }`
          }
        />
      </div>

      <ReportBlock titulo="Consultas completadas por mes">
        <Barras meses={datos.consultasPorMes} />
      </ReportBlock>

      <div className="grid grid-cols-2 gap-6">
        <ReportBlock titulo="Turnos del período">
          <ReportTable
            filas={[
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
            ]}
          />
        </ReportBlock>
        <ReportBlock titulo="Pacientes y reseñas">
          <ReportTable
            filas={[
              { concepto: 'Pacientes atendidos', valor: String(pacientes.unicos) },
              {
                concepto: 'Volvieron más de una vez',
                valor: String(pacientes.recurrentes),
              },
              { concepto: 'Reseñas recibidas', valor: String(resenas.cantidad) },
              { concepto: 'Reseñas sin responder', valor: String(resenas.sinResponder) },
              {
                concepto: 'Calificación promedio',
                valor: resenas.promedio === null ? '—' : `${formatRating(resenas.promedio)} de 5`,
                destacado: true,
              },
            ]}
          />
        </ReportBlock>
      </div>
    </ReportSheet>
  );
}

/** Barras con divs, como en el panel, pero a la medida del papel. */
function Barras({ meses }: { meses: ProfessionalStats['consultasPorMes'] }) {
  const altos = barHeights(meses.map((m) => m.consultas));
  return (
    <ol
      aria-label="Consultas completadas por mes"
      className={`flex h-[46mm] items-end rounded-[10px] border border-line px-4 pb-3 pt-4 ${
        meses.length > 6 ? 'gap-1.5' : 'gap-4'
      }`}
    >
      {meses.map((m, i) => (
        <li key={m.mes} className="flex h-full min-w-0 flex-1 flex-col items-center gap-1">
          <span className="sr-only">
            {monthLong(m.mes)}: {plural(m.consultas, 'consulta')}
          </span>
          <span aria-hidden="true" className="text-[10px] font-bold tabular-nums text-brand-deep">
            {m.consultas}
          </span>
          <span aria-hidden="true" className="flex w-full flex-1 items-end justify-center">
            <span
              className={`block w-full max-w-[16mm] rounded-t-[4px] ${
                m.consultas === 0 ? 'h-[2px] bg-line' : 'bg-brand'
              }`}
              style={m.consultas === 0 ? undefined : { height: `${Math.max(altos[i], 3)}%` }}
            />
          </span>
          <span aria-hidden="true" className="text-[9px] text-muted">
            {monthShort(m.mes)}
          </span>
        </li>
      ))}
    </ol>
  );
}
