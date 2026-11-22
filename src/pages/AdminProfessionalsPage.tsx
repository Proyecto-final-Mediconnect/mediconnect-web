import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { ProfessionalStatus } from '../features/admin/api/adminApi';
import { ProfessionalStatusChip } from '../features/admin/components/ProfessionalStatusChip';
import { useAdminProfessionals } from '../features/admin/hooks/useAdmin';
import { DashboardLayout } from './DashboardLayout';

const FILTROS: { id: ProfessionalStatus | 'TODOS'; label: string }[] = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'VALIDADO', label: 'Validados' },
  { id: 'PENDIENTE_VALIDACION_MATRICULA', label: 'Pendientes' },
  { id: 'SUSPENDIDO', label: 'Suspendidos' },
  { id: 'RECHAZADO', label: 'Rechazados' },
];

/** `4.7` → `4,7`. */
const decimal = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 1 });

/**
 * Profesionales (ENG-241): el listado para el administrador, con su estado y su
 * actividad de los últimos 3 meses. Cada fila abre el detalle, desde donde se
 * suspende o se reactiva. No muestra datos de pacientes.
 */
export function AdminProfessionalsPage() {
  const [status, setStatus] = useState<ProfessionalStatus | 'TODOS'>('TODOS');
  const [texto, setTexto] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const lista = useAdminProfessionals({
    status: status === 'TODOS' ? undefined : status,
    q,
    page,
  });
  const totalPages = lista.data
    ? Math.max(1, Math.ceil(lista.data.total / lista.data.pageSize))
    : 1;

  function buscar(e: FormEvent) {
    e.preventDefault();
    setQ(texto.trim());
    setPage(1);
  }

  return (
    <DashboardLayout
      barTitle="Profesionales"
      greeting="Profesionales"
      subtitle="Todos los profesionales de MediConnect, con su estado y su actividad de los últimos 3 meses."
    >
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={status === f.id}
                onClick={() => {
                  setStatus(f.id);
                  setPage(1);
                }}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                  status === f.id
                    ? 'border-brand-deep bg-brand-deep text-white'
                    : 'border-line-strong bg-white text-brand-deep hover:border-brand'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <form onSubmit={buscar} role="search" className="flex gap-2">
            <label htmlFor="buscar-profesional" className="sr-only">
              Buscar por nombre o matrícula
            </label>
            <input
              id="buscar-profesional"
              type="search"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Nombre o matrícula"
              maxLength={100}
              className="w-56 rounded-full border border-line-strong bg-white px-4 py-1.5 text-sm text-ink outline-none focus:border-brand focus-visible:ring-2 focus-visible:ring-brand"
            />
            <button
              type="submit"
              className="rounded-full bg-brand-deep px-4 py-1.5 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Buscar
            </button>
          </form>
        </div>

        {lista.isPending ? (
          <p role="status" aria-live="polite" className="text-sm text-muted">
            Cargando los profesionales…
          </p>
        ) : lista.isError ? (
          <div
            role="alert"
            className="rounded-[14px] border border-danger/30 bg-danger/5 px-5 py-4 text-sm text-danger"
          >
            <p>{lista.error.message}</p>
            <button
              type="button"
              onClick={() => void lista.refetch()}
              className="mt-2 font-semibold underline"
            >
              Reintentar
            </button>
          </div>
        ) : lista.data.items.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-line-strong bg-white px-5 py-6 text-sm text-muted">
            {q
              ? `No hay profesionales que coincidan con "${q}".`
              : 'No hay profesionales con este filtro.'}
          </p>
        ) : (
          <>
            <ul
              aria-label="Profesionales"
              className="divide-y divide-line-soft overflow-hidden rounded-[14px] border border-line bg-white"
            >
              {lista.data.items.map((pro) => (
                <li key={pro.id}>
                  <Link
                    to={`/admin/profesionales/${pro.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-4 transition-colors hover:bg-surface focus:outline-none focus-visible:bg-surface"
                  >
                    <span className="min-w-0 flex-1 basis-[220px]">
                      <span className="block truncate text-[15px] font-bold text-brand-deep">
                        {pro.lastName}, {pro.firstName}
                      </span>
                      <span className="block truncate text-sm text-muted">
                        {pro.specialties.length > 0
                          ? pro.specialties.join(', ')
                          : 'Sin especialidad'}{' '}
                        · Matrícula {pro.licenseNumber}
                      </span>
                    </span>
                    <span className="text-sm text-muted">
                      {pro.activity.completed}{' '}
                      {pro.activity.completed === 1 ? 'consulta' : 'consultas'} ·{' '}
                      {pro.activity.incidents}{' '}
                      {pro.activity.incidents === 1 ? 'incidencia' : 'incidencias'}
                      {pro.activity.rating !== null &&
                        ` · ★ ${decimal(pro.activity.rating)} (${pro.activity.reviews})`}
                    </span>
                    <ProfessionalStatusChip status={pro.status} />
                    <span aria-hidden="true" className="text-muted-soft">
                      ›
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {totalPages > 1 && (
              <nav aria-label="Páginas" className="flex items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-[9px] border border-line-strong px-3 py-1.5 font-semibold text-brand-deep disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-muted">
                  Página {page} de {totalPages} · {lista.data.total} profesionales
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-[9px] border border-line-strong px-3 py-1.5 font-semibold text-brand-deep disabled:opacity-40"
                >
                  Siguiente
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
