import { useState } from 'react';
import { Link } from 'react-router-dom';
import { downloadMyPatientsCsv } from '../features/my-patients/api/myPatientsApi';
import { useMyPatients } from '../features/my-patients/hooks/useMyPatients';
import { formatMoment } from '../features/my-patients/lib/myPatients';
import type { MyPatientsView } from '../features/my-patients/types';
import { useDebouncedValue } from '../shared/hooks/useDebouncedValue';
import { Button } from '../shared/ui/Button';
import { DashboardLayout } from './DashboardLayout';

const BUSCADOR =
  'w-full rounded-full border border-line-strong bg-white py-2 pl-10 pr-4 text-sm text-ink placeholder:text-muted-soft focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand';

/** Hoy en Argentina, `YYYY-MM-DD`, para el nombre del archivo. */
function hoyAR(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date());
}

/**
 * Mis pacientes (ENG-197): los pacientes que el profesional atendió o tiene
 * agendados, para encontrar a uno y abrir su historia clínica sin buscar un
 * turno viejo.
 *
 * Primero los que se atendieron más recientemente; los que todavía no tuvieron
 * ninguna consulta, al final. La búsqueda es por nombre o apellido, sin
 * importar mayúsculas ni tildes, y el CSV baja lo mismo que se ve.
 */
export function ProfessionalPatientsPage() {
  const [busqueda, setBusqueda] = useState('');
  const q = useDebouncedValue(busqueda.trim(), 300);
  // La página va atada a la búsqueda: buscar otra cosa vuelve a la primera.
  const [paginado, setPaginado] = useState({ q: '', pagina: 1 });
  const pagina = paginado.q === q ? paginado.pagina : 1;
  const pacientes = useMyPatients(q, pagina);
  const [csv, setCsv] = useState<{ cargando: boolean; error: string | null }>({
    cargando: false,
    error: null,
  });

  async function descargar() {
    setCsv({ cargando: true, error: null });
    try {
      const blob = await downloadMyPatientsCsv(q);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mis-pacientes-${hoyAR()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setCsv({ cargando: false, error: null });
    } catch (err) {
      setCsv({ cargando: false, error: (err as Error).message });
    }
  }

  return (
    <DashboardLayout
      barTitle="Mis pacientes"
      subtitle="Los pacientes que atendiste o que tienen un turno con vos. Abrí su historia clínica desde acá."
    >
      <div className="grid gap-5">
        <section
          aria-label="Búsqueda"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-line bg-white p-4"
        >
          <label className="relative min-w-[220px] max-w-[420px] flex-1">
            <span className="sr-only">Buscar paciente por nombre o apellido</span>
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-soft"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="9" cy="9" r="6" />
              <path d="m14 14 4 4" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o apellido"
              maxLength={80}
              className={BUSCADOR}
            />
          </label>

          <Button
            variant="secondary"
            onClick={() => void descargar()}
            disabled={csv.cargando || !pacientes.data || pacientes.data.total === 0}
          >
            {csv.cargando ? 'Generando…' : 'Exportar CSV'}
          </Button>
        </section>

        {csv.error && (
          <p role="alert" className="text-sm text-danger">
            {csv.error}
          </p>
        )}

        {pacientes.isPending ? (
          <Esqueleto />
        ) : pacientes.isError && !pacientes.data ? (
          <div role="alert" className="grid justify-items-start gap-3">
            <p className="text-sm text-danger">{pacientes.error.message}</p>
            <Button variant="secondary" onClick={() => void pacientes.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : pacientes.data.total === 0 ? (
          <Vacio q={q} onLimpiar={() => setBusqueda('')} />
        ) : (
          <Tabla
            datos={pacientes.data}
            pagina={pagina}
            onPagina={(p) => setPaginado({ q, pagina: p })}
            actualizando={pacientes.isFetching}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

function Tabla({
  datos,
  pagina,
  onPagina,
  actualizando,
}: {
  datos: MyPatientsView;
  pagina: number;
  onPagina: (p: number) => void;
  actualizando: boolean;
}) {
  return (
    <section
      aria-labelledby="lista-pacientes"
      aria-busy={actualizando}
      className="overflow-hidden rounded-[14px] border border-line bg-white"
    >
      <div className="flex items-center justify-between border-b border-line-soft px-5 py-3">
        <h2 id="lista-pacientes" className="text-sm font-semibold text-brand-deep">
          Tus pacientes
        </h2>
        <span className="text-xs text-muted">
          {datos.total === 1 ? '1 paciente' : `${datos.total} pacientes`}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line-soft text-[11px] uppercase tracking-[0.1em] text-muted">
            <tr>
              <th className="px-5 py-3 font-semibold">Paciente</th>
              <th className="px-5 py-3 font-semibold">Última consulta</th>
              <th className="px-5 py-3 font-semibold">Próximo turno</th>
              <th className="px-5 py-3 text-right font-semibold">Consultas</th>
              <th className="px-5 py-3 font-semibold">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft tabular-nums">
            {datos.rows.map((fila) => {
              const nombre = `${fila.firstName} ${fila.lastName}`.trim();
              return (
                <tr key={fila.patientId}>
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="flex size-9 flex-none items-center justify-center rounded-full bg-surface-teal text-xs font-bold text-brand-deep"
                      >
                        {fila.firstName.charAt(0)}
                        {fila.lastName.charAt(0)}
                      </span>
                      <span className="font-semibold text-brand-deep">{nombre}</span>
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink">
                    {fila.lastConsultation ? (
                      formatMoment(fila.lastConsultation)
                    ) : (
                      <span className="text-muted">Todavía no</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-ink">
                    {fila.nextAppointment ? (
                      formatMoment(fila.nextAppointment)
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-brand-deep">
                    {fila.consultations}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      to={`/pacientes/${fila.patientId}/historia-clinica`}
                      aria-label={`Ver historia clínica de ${nombre}`}
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-[9px] border border-line-strong px-3 py-1.5 text-sm font-bold text-brand-deep transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                    >
                      Ver historia clínica
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {(pagina > 1 || datos.hayMas) && (
        <div className="flex items-center justify-between border-t border-line-soft px-5 py-3 text-sm">
          <Button variant="ghost" onClick={() => onPagina(pagina - 1)} disabled={pagina === 1}>
            Anteriores
          </Button>
          <span className="text-muted">Página {pagina}</span>
          <Button variant="ghost" onClick={() => onPagina(pagina + 1)} disabled={!datos.hayMas}>
            Siguientes
          </Button>
        </div>
      )}
    </section>
  );
}

function Vacio({ q, onLimpiar }: { q: string; onLimpiar: () => void }) {
  return (
    <section className="grid justify-items-center gap-1.5 rounded-[14px] border border-line bg-white px-6 py-10 text-center">
      {q ? (
        <>
          <h2 className="text-[15px] font-semibold text-brand-deep">
            Ningún paciente coincide con «{q}»
          </h2>
          <p className="max-w-[420px] text-[13px] leading-[1.6] text-muted">
            Probá con otra parte del nombre o del apellido.
          </p>
          <Button variant="ghost" onClick={onLimpiar} className="mt-2">
            Limpiar búsqueda
          </Button>
        </>
      ) : (
        <>
          <h2 className="text-[15px] font-semibold text-brand-deep">
            Todavía no atendiste pacientes
          </h2>
          <p className="max-w-[420px] text-[13px] leading-[1.6] text-muted">
            Cuando un paciente reserve un turno con vos, aparece acá y vas a poder abrir su historia
            clínica.
          </p>
        </>
      )}
    </section>
  );
}

function Esqueleto() {
  return (
    <div role="status" aria-label="Cargando tus pacientes" className="grid gap-2">
      <div className="h-[48px] animate-pulse rounded-[14px] bg-line-soft" />
      <div className="h-[280px] animate-pulse rounded-[14px] bg-line-soft" />
    </div>
  );
}
