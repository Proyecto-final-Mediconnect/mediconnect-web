import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  LECTURA_DE_CONSULTA,
  useClinicalRecord,
  usePatientVital,
} from '../../clinical-records/hooks/useClinicalRecord';
import { ENTRY_TYPE_LABELS } from '../../clinical-records/types/clinicalRecord';

const FECHA = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** Cuántas entradas de la historia se muestran al costado de la llamada. */
const ULTIMAS = 3;

/**
 * Ficha del paciente al costado de la videoconsulta, solo para el profesional
 * (ENG-191). Todo sale de la API: los datos vitales que el paciente cargó para
 * su MediPass y las últimas entradas de su historia clínica.
 *
 * Si algo no carga, la llamada sigue: el error se queda en la columna, con su
 * reintento. Las alergias van primero y en rojo porque son el dato que cambia
 * una indicación en el momento.
 *
 * Con `memo`: la llamada tiene un cronómetro que redibuja cada segundo, y esta
 * columna no depende de él (review de #77).
 */
export const PatientBrief = memo(function PatientBrief({
  patientId,
  nombre,
}: {
  patientId: string;
  nombre: string;
}) {
  const vital = usePatientVital(patientId);
  const historia = useClinicalRecord(patientId, LECTURA_DE_CONSULTA);

  const ultimas = useMemo(
    () =>
      [...(historia.data ?? [])]
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, ULTIMAS),
    [historia.data],
  );

  const alergias = vital.data?.alergias ?? [];
  const medicacion = vital.data?.medicacion ?? [];
  const condiciones = vital.data?.condiciones ?? [];
  const sinDatos = alergias.length + medicacion.length + condiciones.length === 0;

  return (
    <section
      aria-labelledby="ficha-paciente"
      className="overflow-hidden rounded-[14px] border border-line bg-white"
    >
      <header className="border-b border-line-soft px-5 py-[18px]">
        <h2
          id="ficha-paciente"
          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
        >
          Ficha del paciente
        </h2>
        <p className="mt-1.5 text-[15px] font-bold text-brand-deep">
          {nombre}
          {vital.data?.edad != null && ` · ${vital.data.edad} años`}
        </p>
      </header>

      {vital.isPending ? (
        <div aria-hidden="true" className="grid gap-2 px-5 py-4">
          <span className="h-3 w-2/3 animate-pulse rounded bg-surface motion-reduce:animate-none" />
          <span className="h-3 w-1/2 animate-pulse rounded bg-surface motion-reduce:animate-none" />
          <span className="h-3 w-3/4 animate-pulse rounded bg-surface motion-reduce:animate-none" />
        </div>
      ) : vital.isError ? (
        <ErrorConReintento
          mensaje="No pudimos cargar la ficha del paciente."
          reintentar={() => void vital.refetch()}
        />
      ) : sinDatos ? (
        <p className="px-5 py-4 text-[13px] text-muted">
          Este paciente todavía no cargó alergias ni medicación.
        </p>
      ) : (
        <dl className="divide-y divide-line-soft">
          {alergias.length > 0 && (
            <Dato titulo="Alergias">
              <ul className="flex flex-wrap gap-1.5">
                {alergias.map((a, i) => (
                  <li
                    key={`${a.que}-${i}`}
                    className="rounded-full bg-danger/10 px-2.5 py-0.5 text-[12px] font-bold text-danger"
                  >
                    {a.que}
                    {a.gravedad && ` · ${a.gravedad}`}
                  </li>
                ))}
              </ul>
            </Dato>
          )}
          {medicacion.length > 0 && (
            <Dato titulo="Medicación">
              <ul className="grid gap-0.5">
                {medicacion.map((m, i) => (
                  <li key={`${m.droga}-${m.dosis}-${i}`}>
                    {m.droga} {m.dosis}
                  </li>
                ))}
              </ul>
            </Dato>
          )}
          {condiciones.length > 0 && (
            <Dato titulo="Condiciones">
              <ul className="grid gap-0.5">
                {condiciones.map((c, i) => (
                  <li key={`${c.nombre}-${i}`}>{c.nombre}</li>
                ))}
              </ul>
            </Dato>
          )}
        </dl>
      )}

      <div className="border-t border-line-soft px-5 py-4">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-soft">
          Últimas entradas
        </h3>
        {historia.isPending ? (
          <p className="mt-2 text-[13px] text-muted">Cargando la historia clínica…</p>
        ) : historia.isError ? (
          <ErrorConReintento
            mensaje="No pudimos cargar la historia clínica."
            reintentar={() => void historia.refetch()}
            compacto
          />
        ) : ultimas.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted">Todavía no tiene entradas.</p>
        ) : (
          <ul className="mt-2 grid gap-2">
            {ultimas.map((e) => (
              <li key={e.id} className="text-[13px] leading-[1.5]">
                <span className="font-semibold text-ink">
                  {ENTRY_TYPE_LABELS[e.entryType] ?? e.entryType}
                </span>
                <span className="text-muted">
                  {' '}
                  · {FECHA.format(new Date(e.createdAt))}
                  {e.professional && ` · ${e.professional.firstName} ${e.professional.lastName}`}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link
          to={`/pacientes/${patientId}/historia-clinica`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex text-[13px] font-semibold text-brand-hover hover:underline"
        >
          Ver historia completa
        </Link>
      </div>
    </section>
  );
});

function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-3.5">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-soft">
        {titulo}
      </dt>
      <dd className="mt-1 text-[13px] font-semibold leading-[1.6] text-ink">{children}</dd>
    </div>
  );
}

function ErrorConReintento({
  mensaje,
  reintentar,
  compacto = false,
}: {
  mensaje: string;
  reintentar: () => void;
  compacto?: boolean;
}) {
  return (
    <div
      role="alert"
      className={`grid justify-items-start gap-2 ${compacto ? 'mt-2' : 'px-5 py-4'}`}
    >
      <p className="text-[13px] text-danger">{mensaje}</p>
      <button
        type="button"
        onClick={reintentar}
        className="rounded-[8px] border border-line-strong px-3 py-1.5 text-[12px] font-bold text-brand-deep transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        Reintentar
      </button>
    </div>
  );
}
