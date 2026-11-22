import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cuando } from '../features/appointments/lib/timeline';
import { formatPrice } from '../features/appointments/lib/weeks';
import { AccountStatusDialog } from '../features/admin/components/AccountStatusDialog';
import { ProfessionalStatusChip } from '../features/admin/components/ProfessionalStatusChip';
import { useAdminProfessional } from '../features/admin/hooks/useAdmin';
import { DashboardLayout } from './DashboardLayout';

const decimal = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 1 });

/** Una cifra con su rótulo. */
function Dato({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] border border-line bg-white px-4 py-3">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="mt-1 text-[17px] font-bold text-brand-deep">{children}</dd>
    </div>
  );
}

/**
 * El detalle de un profesional para el administrador (ENG-241): sus datos, la
 * misma actividad que él ve en "Mi actividad" y, según su estado, suspenderlo
 * o reactivarlo. La matrícula pendiente se decide en "Matrículas".
 */
export function AdminProfessionalDetailPage() {
  const { professionalId = '' } = useParams<{ professionalId: string }>();
  const detalle = useAdminProfessional(professionalId);
  const [dialogo, setDialogo] = useState<'suspension' | 'reactivation' | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const pro = detalle.data;
  const nombre = pro ? `${pro.firstName} ${pro.lastName}` : 'Profesional';

  return (
    <DashboardLayout barTitle="Profesionales" greeting={nombre}>
      <div className="grid gap-5">
        <Link
          to="/admin/profesionales"
          className="w-fit text-sm font-semibold text-brand-hover hover:underline"
        >
          ‹ Volver a profesionales
        </Link>

        {aviso && (
          <p
            role="status"
            className="rounded-[12px] bg-surface-teal px-4 py-3 text-sm font-semibold text-brand-hover"
          >
            {aviso}
          </p>
        )}

        {detalle.isPending ? (
          <p role="status" aria-live="polite" className="text-sm text-muted">
            Cargando el profesional…
          </p>
        ) : detalle.isError ? (
          <div
            role="alert"
            className="rounded-[14px] border border-danger/30 bg-danger/5 px-5 py-4 text-sm text-danger"
          >
            <p>{detalle.error.message}</p>
            <button
              type="button"
              onClick={() => void detalle.refetch()}
              className="mt-2 font-semibold underline"
            >
              Reintentar
            </button>
          </div>
        ) : (
          pro && (
            <>
              <section
                aria-label="Datos del profesional"
                className="grid gap-3 rounded-[14px] border border-line bg-white p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <ProfessionalStatusChip status={pro.status} />
                  <div className="flex flex-wrap gap-2">
                    {pro.status === 'VALIDADO' && (
                      <button
                        type="button"
                        onClick={() => {
                          setAviso(null);
                          setDialogo('suspension');
                        }}
                        className="rounded-[9px] border border-line-strong px-4 py-2 text-sm font-bold text-danger transition-colors hover:border-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                      >
                        Suspender
                      </button>
                    )}
                    {pro.status === 'SUSPENDIDO' && (
                      <button
                        type="button"
                        onClick={() => {
                          setAviso(null);
                          setDialogo('reactivation');
                        }}
                        className="rounded-[9px] bg-brand-deep px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                      >
                        Reactivar
                      </button>
                    )}
                    {pro.status === 'PENDIENTE_VALIDACION_MATRICULA' && (
                      <Link
                        to="/admin/matriculas"
                        className="rounded-[9px] bg-brand-deep px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-night"
                      >
                        Revisar la matrícula
                      </Link>
                    )}
                  </div>
                </div>
                <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted">Matrícula</dt>
                    <dd className="font-semibold text-ink">{pro.licenseNumber}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Especialidades</dt>
                    <dd className="font-semibold text-ink">
                      {pro.specialties.length > 0 ? pro.specialties.join(', ') : 'Sin especialidad'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Mail</dt>
                    <dd className="font-semibold text-ink">{pro.email}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Se registró</dt>
                    <dd className="font-semibold text-ink">
                      {cuando(pro.registeredAt)?.split(' · ')[0] ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Precio de la consulta</dt>
                    <dd className="font-semibold text-ink">
                      {pro.consultationPrice === null
                        ? 'Sin publicar'
                        : formatPrice(pro.consultationPrice, pro.currency)}
                    </dd>
                  </div>
                </dl>
              </section>

              <section aria-label="Actividad de los últimos 3 meses" className="grid gap-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Actividad de los últimos 3 meses
                </h3>
                <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Dato label="Consultas completadas">{pro.stats.turnos.completados}</Dato>
                  <Dato label="Cancelación">
                    {pro.stats.tasas.cancelacion
                      ? `${decimal(pro.stats.tasas.cancelacion.porcentaje)} %`
                      : '—'}
                  </Dato>
                  <Dato label="Ausentismo de pacientes">
                    {pro.stats.tasas.ausentismo
                      ? `${decimal(pro.stats.tasas.ausentismo.porcentaje)} %`
                      : '—'}
                  </Dato>
                  <Dato label="Calificación">
                    {pro.stats.resenas.promedio !== null
                      ? `★ ${decimal(pro.stats.resenas.promedio)} (${pro.stats.resenas.cantidad})`
                      : 'Sin reseñas'}
                  </Dato>
                  <Dato label="Turnos que canceló">
                    {pro.stats.incidencias?.cancelaciones ?? 0}
                  </Dato>
                  <Dato label="Consultas sin conectarse">
                    {pro.stats.incidencias?.ausencias ?? 0}
                  </Dato>
                  <Dato label="Fallas técnicas informadas">
                    {pro.stats.incidencias?.fallasTecnicas ?? 0}
                  </Dato>
                  <Dato label="Turnos por venir">{pro.stats.turnos.porVenir}</Dato>
                </dl>
              </section>

              <AccountStatusDialog
                professional={pro}
                action={dialogo ?? 'suspension'}
                open={dialogo !== null}
                onClose={() => setDialogo(null)}
                onDone={setAviso}
              />
            </>
          )
        )}
      </div>
    </DashboardLayout>
  );
}
