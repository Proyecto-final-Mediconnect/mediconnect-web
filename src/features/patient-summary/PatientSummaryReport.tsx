import { formatPrice } from '../appointments/lib/weeks';
import { ReportBlock, ReportKpi, ReportSheet, ReportTable } from '../../shared/ui/PrintableReport';
import { rangoLegible } from '../../shared/lib/printReport';
import type { PatientSummary } from './api';

/**
 * La hoja en PDF de "Tu resumen" (ENG-198): consultas, pagos y accesos a la
 * información del paciente en el período, con el detalle de cada cosa.
 */
export function PatientSummaryReport({
  datos,
  periodo,
  persona,
}: {
  datos: PatientSummary;
  periodo: string;
  persona?: string;
}) {
  const { consultas, pagos, accesos, currency } = datos;
  const plata = (n: number) => formatPrice(n, currency);

  return (
    <ReportSheet
      titulo="Resumen de tu actividad"
      persona={persona}
      periodo={periodo}
      rango={rangoLegible(datos.from, datos.to)}
      pie={
        <>
          <p>
            Los turnos se pagan al reservarlos: lo pagado incluye turnos que todavía no pasaron. Los
            reembolsos son por turnos cancelados, según la política de cada profesional.
          </p>
          <p>
            Cada acceso a tu historia clínica y a tu MediPass queda registrado y no se puede borrar.
            El detalle (quién, cuándo y por qué) está en MediConnect.
          </p>
        </>
      }
    >
      <div className="grid grid-cols-4 gap-3">
        <ReportKpi
          etiqueta="Consultas realizadas"
          valor={String(consultas.realizadas)}
          apagado={consultas.realizadas === 0}
          detalle={
            consultas.profesionales === 1
              ? 'Con 1 profesional'
              : `Con ${consultas.profesionales} profesionales`
          }
        />
        <ReportKpi
          etiqueta="Pagaste"
          valor={plata(pagos.pagado)}
          apagado={pagos.pagado === 0}
          detalle={pagos.turnos === 1 ? 'Por 1 turno' : `Por ${pagos.turnos} turnos`}
        />
        <ReportKpi
          etiqueta="Te reembolsaron"
          valor={plata(pagos.reembolsado)}
          apagado={pagos.reembolsado === 0}
          detalle="Por turnos cancelados"
        />
        <ReportKpi
          etiqueta="Accesos a tu información"
          valor={String(accesos.total)}
          apagado={accesos.total === 0}
          detalle={`${accesos.medipass} al MediPass · ${accesos.historiaClinica} a tu historia`}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <ReportBlock titulo="Pagos">
          <ReportTable
            filas={[
              { concepto: 'Pagado', valor: plata(pagos.pagado) },
              { concepto: 'Reembolsado', valor: `− ${plata(pagos.reembolsado)}` },
              { concepto: 'Total neto', valor: plata(pagos.neto), destacado: true },
              {
                concepto: 'Turnos pagados',
                valor: String(pagos.turnos),
              },
              { concepto: 'De esos, todavía por venir', valor: String(pagos.porVenir) },
            ]}
          />
        </ReportBlock>
        <ReportBlock titulo="Consultas y accesos">
          <ReportTable
            filas={[
              { concepto: 'Consultas realizadas', valor: String(consultas.realizadas) },
              { concepto: 'Profesionales distintos', valor: String(consultas.profesionales) },
              { concepto: 'Accesos a tu historia clínica', valor: String(accesos.historiaClinica) },
              { concepto: 'Accesos a tu MediPass', valor: String(accesos.medipass) },
              {
                concepto: 'Accesos en total',
                valor: String(accesos.total),
                destacado: true,
              },
            ]}
          />
        </ReportBlock>
      </div>
    </ReportSheet>
  );
}
