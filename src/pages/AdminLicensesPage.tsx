import { useState, type KeyboardEvent } from 'react';
import { formatDate } from '../features/appointments/lib/weeks';
import { cuando } from '../features/appointments/lib/timeline';
import type {
  LicenseDecision,
  LicenseQueueItem,
  LicenseQueueStatus,
} from '../features/admin/api/adminApi';
import { LicenseDecisionDialog } from '../features/admin/components/LicenseDecisionDialog';
import { useLicenseQueue } from '../features/admin/hooks/useAdmin';
import { DashboardLayout } from './DashboardLayout';

/**
 * El registro público donde se verifica una matrícula: SISA, del Ministerio de
 * Salud, con la consulta pública de profesionales (REFEPS). No admite un link
 * directo a un profesional, así que abre el buscador.
 */
export const REGISTRO_PUBLICO_URL = 'https://sisa.msal.gov.ar/sisa/';

const PESTANAS: { id: LicenseQueueStatus; label: string }[] = [
  { id: 'PENDIENTE_VALIDACION_MATRICULA', label: 'Pendientes' },
  { id: 'VALIDADO', label: 'Validadas' },
  { id: 'RECHAZADO', label: 'Rechazadas' },
];

const VACIO: Record<LicenseQueueStatus, string> = {
  PENDIENTE_VALIDACION_MATRICULA: 'No hay profesionales esperando validación.',
  VALIDADO: 'Todavía no hay matrículas validadas.',
  RECHAZADO: 'No hay matrículas rechazadas.',
};

/** `2026-11-20T10:00:00Z` → `20 de noviembre`, en el día argentino. */
function fechaDe(iso: string): string {
  return cuando(iso)?.split(' · ')[0] ?? formatDate(iso.slice(0, 10));
}

/**
 * Matrículas (ENG-192): el administrador valida o rechaza la matrícula de los
 * profesionales que se registraron. Hasta que se valida, el profesional no
 * aparece en el catálogo y no se le puede reservar.
 *
 * Tres pestañas: las pendientes (del que más esperó al más nuevo) y las ya
 * decididas, con la fecha y el motivo del rechazo. La verificación se hace en
 * el registro público, que abre en otra pestaña.
 */
export function AdminLicensesPage() {
  const [tab, setTab] = useState<LicenseQueueStatus>('PENDIENTE_VALIDACION_MATRICULA');
  const [decidiendo, setDecidiendo] = useState<{
    professional: LicenseQueueItem;
    decision: LicenseDecision;
  } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const cola = useLicenseQueue(tab);
  // El contador de la pestaña de pendientes se ve desde cualquier pestaña.
  const pendientes = useLicenseQueue('PENDIENTE_VALIDACION_MATRICULA');

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = PESTANAS.findIndex((p) => p.id === tab);
    const siguiente = PESTANAS[(i + (e.key === 'ArrowRight' ? 1 : PESTANAS.length - 1)) % 3];
    setTab(siguiente.id);
    document.getElementById(`tab-matriculas-${siguiente.id}`)?.focus();
  };

  return (
    <DashboardLayout
      barTitle="Matrículas"
      greeting="Matrículas"
      subtitle="Validá la matrícula de cada profesional en el registro público antes de que aparezca en el catálogo."
    >
      <div className="grid gap-4">
        {aviso && (
          <p
            role="status"
            className="rounded-[12px] bg-surface-teal px-4 py-3 text-sm font-semibold text-brand-hover"
          >
            {aviso}
          </p>
        )}

        <div
          role="tablist"
          aria-label="Matrículas por estado"
          onKeyDown={onKeyDown}
          className="flex gap-2 border-b border-line"
        >
          {PESTANAS.map((p) => {
            const activa = p.id === tab;
            const cuantos =
              p.id === 'PENDIENTE_VALIDACION_MATRICULA' ? pendientes.data?.length : undefined;
            return (
              <button
                key={p.id}
                id={`tab-matriculas-${p.id}`}
                type="button"
                role="tab"
                aria-selected={activa}
                aria-controls="panel-matriculas"
                tabIndex={activa ? 0 : -1}
                onClick={() => setTab(p.id)}
                className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:bg-surface ${
                  activa
                    ? 'border-brand text-brand-deep'
                    : 'border-transparent text-muted hover:text-brand-deep'
                }`}
              >
                {p.label}
                {cuantos !== undefined && cuantos > 0 && (
                  <span className="rounded-full bg-tag-warm px-2 py-0.5 text-xs font-bold text-tag-warm-ink">
                    {cuantos}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div
          id="panel-matriculas"
          role="tabpanel"
          aria-labelledby={`tab-matriculas-${tab}`}
          tabIndex={0}
          className="focus:outline-none"
        >
          {cola.isPending ? (
            <p role="status" aria-live="polite" className="text-sm text-muted">
              Cargando las matrículas…
            </p>
          ) : cola.isError ? (
            <div
              role="alert"
              className="rounded-[14px] border border-danger/30 bg-danger/5 px-5 py-4 text-sm text-danger"
            >
              <p>{cola.error.message}</p>
              <button
                type="button"
                onClick={() => void cola.refetch()}
                className="mt-2 font-semibold underline"
              >
                Reintentar
              </button>
            </div>
          ) : cola.data.length === 0 ? (
            <p className="rounded-[14px] border border-dashed border-line-strong bg-white px-5 py-6 text-sm text-muted">
              {VACIO[tab]}
            </p>
          ) : (
            <ul className="grid gap-3" aria-label="Profesionales">
              {cola.data.map((pro) => (
                <li
                  key={pro.id}
                  className="grid gap-3 rounded-[14px] border border-line bg-white p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[16px] font-bold text-brand-deep">
                        {pro.firstName} {pro.lastName}
                      </p>
                      <p className="text-sm text-muted">
                        {pro.specialties.length > 0
                          ? pro.specialties.join(', ')
                          : 'Sin especialidad cargada'}
                      </p>
                    </div>
                    <p className="rounded-[9px] bg-surface px-3 py-1.5 font-mono text-[15px] font-bold tracking-[0.04em] text-brand-deep">
                      {pro.licenseNumber}
                    </p>
                  </div>

                  <p className="text-sm text-muted">
                    {pro.email} · Se registró el {fechaDe(pro.registeredAt)}
                    {pro.decision &&
                      ` · ${tab === 'RECHAZADO' ? 'Rechazada' : 'Validada'} el ${fechaDe(pro.decision.at)}`}
                  </p>
                  {pro.decision?.reason && (
                    <p className="text-sm text-ink">Motivo: {pro.decision.reason}</p>
                  )}

                  {tab === 'PENDIENTE_VALIDACION_MATRICULA' && (
                    <div className="flex flex-wrap items-center gap-3">
                      <a
                        href={REGISTRO_PUBLICO_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-brand-hover hover:underline"
                      >
                        Verificar en el registro público ↗
                      </a>
                      <span className="flex-1" />
                      <button
                        type="button"
                        onClick={() => {
                          setAviso(null);
                          setDecidiendo({ professional: pro, decision: 'RECHAZADO' });
                        }}
                        className="rounded-[9px] border border-line-strong px-4 py-2 text-sm font-bold text-danger transition-colors hover:border-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                      >
                        Rechazar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAviso(null);
                          setDecidiendo({ professional: pro, decision: 'VALIDADO' });
                        }}
                        className="rounded-[9px] bg-brand-deep px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                      >
                        Validar
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <LicenseDecisionDialog
        professional={decidiendo?.professional ?? null}
        decision={decidiendo?.decision ?? 'VALIDADO'}
        onClose={() => setDecidiendo(null)}
        onDecided={setAviso}
      />
    </DashboardLayout>
  );
}
