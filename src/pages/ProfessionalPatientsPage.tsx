import { useState } from 'react';
import { Link } from 'react-router-dom';
import { downloadMyPatientsXlsx } from '../features/my-patients/api/myPatientsApi';
import { useMyPatients } from '../features/my-patients/hooks/useMyPatients';
import {
  formatDay,
  formatMoment,
  LAST_OPTIONS,
  NEXT_OPTIONS,
  toggleSort,
} from '../features/my-patients/lib/myPatients';
import type {
  MyPatientsFilters,
  MyPatientsOrder,
  MyPatientsView,
  SortDir,
} from '../features/my-patients/types';
import { useDebouncedValue } from '../shared/hooks/useDebouncedValue';
import { Button } from '../shared/ui/Button';
import { DashboardLayout } from './DashboardLayout';

const BUSCADOR =
  'w-full rounded-full border border-line-strong bg-white py-2 pl-10 pr-4 text-sm text-ink placeholder:text-muted-soft focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand';

const SELECT =
  'rounded-full border border-line-strong bg-white px-3.5 py-2 text-sm font-semibold text-brand-deep focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand';

/** Hoy en Argentina, `YYYY-MM-DD`, para el nombre del archivo. */
function hoyAR(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date());
}

type Filtros = Omit<MyPatientsFilters, 'q'>;

const INICIALES: Filtros = { orden: 'ULTIMA_CONSULTA', dir: 'desc' };

/**
 * Mis pacientes (ENG-197): los pacientes que el profesional atendió o tiene
 * agendados, para encontrar a uno y abrir su historia clínica sin buscar un
 * turno viejo.
 *
 * Cada columna ordena al tocar su encabezado (y de nuevo, al revés). Se puede
 * buscar por nombre o apellido y filtrar por próximo turno o por cuándo fue la
 * última consulta: "quiénes no vienen hace más de seis meses" es una pregunta
 * real de un consultorio. El Excel baja lo mismo que se ve, en el mismo orden.
 */
export function ProfessionalPatientsPage() {
  const [busqueda, setBusqueda] = useState('');
  const q = useDebouncedValue(busqueda.trim(), 300);
  const [filtros, setFiltros] = useState<Filtros>(INICIALES);
  const consulta: MyPatientsFilters = { q, ...filtros };
  // La página va atada a la consulta: cambiar búsqueda, filtro u orden vuelve a la primera.
  const clave = JSON.stringify(consulta);
  const [paginado, setPaginado] = useState({ clave: '', pagina: 1 });
  const pagina = paginado.clave === clave ? paginado.pagina : 1;
  const pacientes = useMyPatients(consulta, pagina);
  const [excel, setExcel] = useState<{ cargando: boolean; error: string | null }>({
    cargando: false,
    error: null,
  });
  const hayFiltros = !!(q || filtros.proximo || filtros.ultima);

  function limpiar() {
    setBusqueda('');
    setFiltros((f) => ({ orden: f.orden, dir: f.dir }));
  }

  async function descargar() {
    setExcel({ cargando: true, error: null });
    try {
      const blob = await downloadMyPatientsXlsx(consulta);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mis-pacientes-${hoyAR()}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      setExcel({ cargando: false, error: null });
    } catch (err) {
      setExcel({ cargando: false, error: (err as Error).message });
    }
  }

  return (
    <DashboardLayout
      barTitle="Mis pacientes"
      subtitle="Los pacientes que atendiste o que tienen un turno con vos. Abrí su historia clínica desde acá."
    >
      <div className="grid gap-5">
        <section
          aria-label="Búsqueda y filtros"
          className="grid gap-3 rounded-[14px] border border-line bg-white p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
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
              disabled={excel.cargando || !pacientes.data || pacientes.data.total === 0}
            >
              {excel.cargando ? 'Generando…' : 'Exportar a Excel'}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-line-soft pt-3">
            <label>
              <span className="sr-only">Próximo turno</span>
              <select
                value={filtros.proximo ?? ''}
                onChange={(e) =>
                  setFiltros((f) => ({
                    ...f,
                    proximo: (e.target.value || undefined) as Filtros['proximo'],
                  }))
                }
                className={SELECT}
              >
                <option value="">Con y sin próximo turno</option>
                {NEXT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Última consulta</span>
              <select
                value={filtros.ultima ?? ''}
                onChange={(e) =>
                  setFiltros((f) => ({
                    ...f,
                    ultima: (e.target.value || undefined) as Filtros['ultima'],
                  }))
                }
                className={SELECT}
              >
                <option value="">Cualquier última consulta</option>
                {LAST_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {hayFiltros && (
              <button
                type="button"
                onClick={limpiar}
                className="text-sm font-bold text-brand-hover hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </section>

        {excel.error && (
          <p role="alert" className="text-sm text-danger">
            {excel.error}
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
          <Vacio q={q} conFiltros={hayFiltros} onLimpiar={limpiar} />
        ) : (
          <Tabla
            datos={pacientes.data}
            orden={filtros}
            onOrdenar={(columna) => setFiltros((f) => ({ ...f, ...toggleSort(f, columna) }))}
            pagina={pagina}
            onPagina={(p) => setPaginado({ clave, pagina: p })}
            actualizando={pacientes.isFetching}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

/** Encabezado que ordena: un botón, con la flecha del sentido y `aria-sort`. */
function Encabezado({
  columna,
  orden,
  onOrdenar,
  alinear = 'left',
  children,
}: {
  columna: MyPatientsOrder;
  orden: { orden: MyPatientsOrder; dir: SortDir };
  onOrdenar: (c: MyPatientsOrder) => void;
  alinear?: 'left' | 'right';
  children: string;
}) {
  const activa = orden.orden === columna;
  return (
    <th
      aria-sort={activa ? (orden.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-5 py-3 font-semibold ${alinear === 'right' ? 'text-right' : ''}`}
    >
      <button
        type="button"
        onClick={() => onOrdenar(columna)}
        className={`inline-flex items-center gap-1 uppercase tracking-[0.1em] hover:text-brand-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
          activa ? 'text-brand-deep' : ''
        }`}
      >
        {children}
        <span aria-hidden="true" className={activa ? '' : 'opacity-30'}>
          {activa && orden.dir === 'asc' ? '↑' : '↓'}
        </span>
      </button>
    </th>
  );
}

function Tabla({
  datos,
  orden,
  onOrdenar,
  pagina,
  onPagina,
  actualizando,
}: {
  datos: MyPatientsView;
  orden: { orden: MyPatientsOrder; dir: SortDir };
  onOrdenar: (c: MyPatientsOrder) => void;
  pagina: number;
  onPagina: (p: number) => void;
  actualizando: boolean;
}) {
  const props = { orden, onOrdenar };
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
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-line-soft text-[11px] text-muted">
            <tr>
              <Encabezado columna="NOMBRE" {...props}>
                Paciente
              </Encabezado>
              <Encabezado columna="PACIENTE_DESDE" {...props}>
                Paciente desde
              </Encabezado>
              <Encabezado columna="ULTIMA_CONSULTA" {...props}>
                Última consulta
              </Encabezado>
              <Encabezado columna="PROXIMO_TURNO" {...props}>
                Próximo turno
              </Encabezado>
              <Encabezado columna="CONSULTAS" alinear="right" {...props}>
                Consultas
              </Encabezado>
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
                      <span className="grid">
                        <span className="font-semibold text-brand-deep">{nombre}</span>
                        {fila.age !== null && (
                          <span className="text-xs text-muted">{fila.age} años</span>
                        )}
                      </span>
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink">
                    {fila.firstConsultation ? (
                      formatDay(fila.firstConsultation)
                    ) : (
                      <span className="text-muted">—</span>
                    )}
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

function Vacio({
  q,
  conFiltros,
  onLimpiar,
}: {
  q: string;
  conFiltros: boolean;
  onLimpiar: () => void;
}) {
  return (
    <section className="grid justify-items-center gap-1.5 rounded-[14px] border border-line bg-white px-6 py-10 text-center">
      {conFiltros ? (
        <>
          <h2 className="text-[15px] font-semibold text-brand-deep">
            {q ? `Ningún paciente coincide con «${q}»` : 'Ningún paciente coincide con los filtros'}
          </h2>
          <p className="max-w-[420px] text-[13px] leading-[1.6] text-muted">
            Probá con otra búsqueda o sacá algún filtro.
          </p>
          <Button variant="ghost" onClick={onLimpiar} className="mt-2">
            Limpiar filtros
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
