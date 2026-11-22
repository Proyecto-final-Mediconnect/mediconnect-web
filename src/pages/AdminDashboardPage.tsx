import { useAdminProfile } from '../features/admin/hooks/useAdmin';
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
        <p className="text-sm text-muted">
          Entraste como <span className="font-semibold text-brand-deep">{admin.data.email}</span>.
        </p>
      )}
    </DashboardLayout>
  );
}
