import { useState } from 'react';
import { Link } from 'react-router-dom';
import { describeDuration, formatClock } from '../lib/elapsed';
import {
  MOCK_SUMMARY,
  MOCK_TRANSCRIPT,
  MOCK_TRANSCRIPT_LINES,
  mockPatientBrief,
} from '../lib/mockConsultation';

/**
 * Resumen de la consulta (fase de cierre del canvas).
 *
 * ⚠️ **Nada de esta pantalla está conectado.** El resumen no lo genera ningún
 * modelo, la transcripción no existe y **firmar no escribe en la historia
 * clínica**: `ClinicalRecordsService` está construido y testeado en el backend
 * —append-only, cadena de hash— pero no tiene controller, así que no hay ruta
 * HTTP a la que llamar.
 *
 * Eso obliga a una decisión de diseño: en el canvas el botón dice "Firmar e
 * incorporar a la historia". Firmar es un acto médico irreversible —el propio
 * texto del canvas aclara que después no se puede editar—, así que un botón que
 * diga eso y no lo haga es la clase de mentira que en una demo se toma por
 * verdad. Acá el botón existe, se puede apretar, y lo que confirma es
 * explícitamente que **todavía no se incorporó nada**.
 */

type ConsultationSummaryProps = {
  counterpartName: string;
  joinedAt: Date;
  endedAt: Date;
  onBack: () => void;
};

type Estado = 'REVISANDO' | 'EDITANDO' | 'FIRMADO';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** `Date` → `Jueves 3 de septiembre`. */
function formatLongDay(date: Date): string {
  const dia = DIAS[date.getDay()];
  return `${dia[0].toUpperCase()}${dia.slice(1)} ${date.getDate()} de ${MESES[date.getMonth()]}`;
}

export function ConsultationSummary({
  counterpartName,
  joinedAt,
  endedAt,
  onBack,
}: ConsultationSummaryProps) {
  const [estado, setEstado] = useState<Estado>('REVISANDO');
  const [texto, setTexto] = useState(MOCK_SUMMARY);
  const [verTranscripcion, setVerTranscripcion] = useState(false);

  const ficha = mockPatientBrief();
  const duracion = endedAt.getTime() - joinedAt.getTime();

  return (
    <div className="grid gap-5">
      <header className="rounded-[14px] border border-night bg-night p-7 text-white lg:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-bright">
          Consulta finalizada · transcripción lista
        </p>
        <h2 className="font-display mt-3 text-[30px] leading-[1.1] text-white lg:text-[38px]">
          {counterpartName} · {ficha.edad} años
        </h2>
        <p className="mt-2.5 text-sm text-on-night">
          {formatLongDay(endedAt)}, {formatClock(joinedAt)} a {formatClock(endedAt)} ·{' '}
          {describeDuration(duracion)} · videoconsulta
        </p>

        <button
          type="button"
          onClick={onBack}
          className="mt-6 rounded-[9px] border border-white/25 px-5 py-3 text-sm font-bold text-white transition-colors hover:border-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright focus-visible:ring-offset-2 focus-visible:ring-offset-night"
        >
          Volver a la consulta en curso
        </button>
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section
          aria-labelledby="resumen"
          className="overflow-hidden rounded-[14px] border border-line bg-white"
        >
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line-soft px-6 py-[18px]">
            <div>
              <h3 id="resumen" className="text-[17px] font-bold text-brand-deep">
                Resumen de la consulta
              </h3>
              <p className="mt-1 text-[13px] text-muted">
                Generado a partir de la transcripción · editable antes de firmar
              </p>
            </div>

            {estado !== 'FIRMADO' && (
              <button
                type="button"
                onClick={() => setEstado(estado === 'EDITANDO' ? 'REVISANDO' : 'EDITANDO')}
                className="rounded-[8px] border border-line-strong bg-white px-3.5 py-2 text-[13px] font-bold text-brand-deep transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {estado === 'EDITANDO' ? 'Listo' : 'Editar'}
              </button>
            )}
          </header>

          <div className="px-6 py-5">
            {estado === 'EDITANDO' ? (
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                aria-label="Resumen de la consulta"
                rows={18}
                className="w-full resize-y rounded-[10px] border border-line-strong bg-white px-4 py-3 font-sans text-[14px] leading-[1.7] text-ink focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              />
            ) : (
              // `whitespace-pre-wrap` conserva los saltos del texto: el resumen
              // viene en secciones y aplastarlo a un párrafo lo vuelve ilegible.
              <p className="whitespace-pre-wrap text-[14px] leading-[1.7] text-ink">{texto}</p>
            )}
          </div>

          <p className="mx-6 mb-5 rounded-[10px] border border-brand/30 bg-surface-teal px-4 py-3 text-[13px] leading-[1.7] text-brand-deep">
            Este resumen fue generado con asistencia de IA sobre la transcripción de la
            consulta. Revisalo y corregí lo que haga falta: una vez firmado se incorpora a la
            historia clínica de la paciente y no se puede editar.
          </p>
        </section>

        <aside className="grid gap-4">
          <section className="overflow-hidden rounded-[14px] border border-line bg-white">
            <header className="border-b border-line-soft px-5 py-[18px]">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Cerrar la consulta
              </h3>
            </header>

            <div className="grid gap-3 px-5 py-[18px]">
              {estado === 'FIRMADO' ? (
                <>
                  <p
                    role="status"
                    className="rounded-[10px] border border-brand/40 bg-surface-teal px-4 py-3 text-[13px] leading-[1.7] text-ink"
                  >
                    Firmaste el resumen. <strong className="font-bold">Todavía no se
                    incorporó a la historia clínica</strong>: falta el endpoint que lo guarde.
                  </p>
                  <Link
                    to="/mis-turnos"
                    className="rounded-[10px] bg-brand-deep py-[13px] text-center text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                  >
                    Volver a mis consultas
                  </Link>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setEstado('FIRMADO')}
                    className="rounded-[10px] bg-brand py-[14px] text-[15px] font-bold text-ink-deep transition-colors hover:bg-brand-hover hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                  >
                    Firmar e incorporar a la historia
                  </button>
                  <button
                    type="button"
                    disabled
                    title="Guardar borradores todavía no está conectado"
                    className="rounded-[10px] border border-line-strong bg-white py-[13px] text-[13px] font-bold text-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Guardar como borrador
                  </button>
                  <button
                    type="button"
                    onClick={() => setTexto(MOCK_SUMMARY)}
                    className="text-[13px] font-semibold text-muted underline-offset-2 hover:text-danger hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    Descartar los cambios
                  </button>
                </>
              )}
            </div>

            <p className="border-t border-dashed border-line-strong bg-surface px-5 py-3 text-[11px] leading-[1.6] text-muted-soft">
              Firmar todavía no escribe nada: la historia clínica no tiene endpoint.
            </p>
          </section>

          <section className="overflow-hidden rounded-[14px] border border-line bg-white">
            <header className="border-b border-line-soft px-5 py-[18px]">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Transcripción completa
              </h3>
              {/* Sin la duración: ya está en el encabezado, y repetirla al lado
                  del conteo inventado de intervenciones mezclaba un dato real con
                  uno de ejemplo en la misma línea. */}
              <p className="mt-1.5 text-[13px] text-muted">
                {MOCK_TRANSCRIPT_LINES} intervenciones
              </p>
            </header>

            <div className="grid gap-3 px-5 py-[18px]">
              <button
                type="button"
                onClick={() => setVerTranscripcion((v) => !v)}
                aria-expanded={verTranscripcion}
                className="rounded-[8px] border border-line-strong bg-white py-2.5 text-[13px] font-bold text-brand-deep transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {verTranscripcion ? 'Ocultar transcripción' : 'Ver transcripción'}
              </button>

              {verTranscripcion && (
                <ul className="grid max-h-[300px] gap-3 overflow-y-auto">
                  {MOCK_TRANSCRIPT.map((linea) => (
                    <li key={linea.id}>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-soft">
                        {linea.quien === 'PROFESIONAL' ? 'Vos' : 'Paciente'}
                      </p>
                      <p className="mt-0.5 text-[13px] leading-[1.6] text-ink">{linea.texto}</p>
                    </li>
                  ))}
                </ul>
              )}

              {/* La descarga del canvas no está: no hay archivo que bajar, y un
                  botón que ofrece descargar la transcripción de una consulta
                  médica y entrega un placeholder es peor que no ofrecerlo. */}
              <p className="text-[11px] leading-[1.6] text-muted-soft">
                La transcripción se conserva asociada a la consulta y solo es visible para vos
                y para la paciente.
              </p>
            </div>

            <p className="border-t border-dashed border-line-strong bg-surface px-5 py-3 text-[11px] leading-[1.6] text-muted-soft">
              Transcripción de ejemplo: no se transcribió nada.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
