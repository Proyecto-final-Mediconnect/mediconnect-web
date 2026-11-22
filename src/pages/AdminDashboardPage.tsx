import { Link } from 'react-router-dom';
import { useAdminProfile, useLicenseQueue } from '../features/admin/hooks/useAdmin';
import { DashboardLayout } from './DashboardLayout';

/**
 * Panel del administrador (ENG-240): el equipo de MediConnect, que administra a
 * los profesionales (ENG-220).
 *
 * Confirma el acceso con `GET /admin/me` en lugar de confiar solo en el rol que
 * la web tiene en memoria: si el backend dice que no, el panel no se muestra.
 * Se llena con la gestión de médicos: validar matrículas (ENG-192), el listado y
 * la suspensión de profesionales (ENG-241) y el panel de plataforma (ENG-195).
 */
export function AdminDashboardPage() {
  const admin = useAdminProfile();
  const pendientes = useLicenseQueue('PENDIENTE_VALIDACION_MATRICULA');
  const cuantos = pendientes.data?.length ?? 0;

  return (
    <DashboardLayout
      barTitle="Panel"
      greeting="Administración"
      subtitle="Desde acá se administra a los profesionales de MediConnect."
    >
      {admin.isPending ? (
        <p role="status" aria-live="polite" className="text-sm text-muted">
          Cargando el panel…
        </p>
      ) : admin.isError ? (
        <div
          role="alert"
          className="rounded-[14px] border border-danger/30 bg-danger/5 px-5 py-4 text-sm text-danger"
        >
          <p>{admin.error.message}</p>
          <button
            type="button"
            onClick={() => void admin.refetch()}
            className="mt-2 font-semibold underline"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="grid gap-5">
          <p className="text-sm text-muted">
            Entraste como <span className="font-semibold text-brand-deep">{admin.data.email}</span>.
          </p>
          {/* Lo que espera una acción: un profesional pendiente no aparece en el
              catálogo hasta que se valida su matrícula (ENG-192). */}
          <Link
            to="/admin/matriculas"
            className="flex max-w-[520px] items-center justify-between gap-4 rounded-[14px] border border-line bg-white px-5 py-4 transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <span>
              <span className="block text-[15px] font-bold text-brand-deep">Matrículas</span>
              <span className="block text-sm text-muted">
                {pendientes.isPending
                  ? 'Cargando…'
                  : cuantos === 0
                    ? 'No hay profesionales esperando validación.'
                    : cuantos === 1
                      ? '1 profesional espera la validación de su matrícula.'
                      : `${cuantos} profesionales esperan la validación de su matrícula.`}
              </span>
            </span>
            <span aria-hidden="true" className="text-muted-soft">
              ›
            </span>
          </Link>
          <Link
            to="/admin/profesionales"
            className="flex max-w-[520px] items-center justify-between gap-4 rounded-[14px] border border-line bg-white px-5 py-4 transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <span>
              <span className="block text-[15px] font-bold text-brand-deep">Profesionales</span>
              <span className="block text-sm text-muted">
                Todos los profesionales, su actividad, y suspenderlos o reactivarlos.
              </span>
            </span>
            <span aria-hidden="true" className="text-muted-soft">
              ›
            </span>
          </Link>
          <Link
            to="/admin/plataforma"
            className="flex max-w-[520px] items-center justify-between gap-4 rounded-[14px] border border-line bg-white px-5 py-4 transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <span>
              <span className="block text-[15px] font-bold text-brand-deep">Plataforma</span>
              <span className="block text-sm text-muted">
                Cómo se usa MediConnect y si la historia clínica sigue íntegra.
              </span>
            </span>
            <span aria-hidden="true" className="text-muted-soft">
              ›
            </span>
          </Link>
        </div>
      )}
    </DashboardLayout>
  );
}
