import { Link } from 'react-router-dom';
import { PatientProfileForm } from '../features/patient-profile/components/PatientProfileForm';
import { useSession } from '../features/auth/hooks/useSession';
import { useMyProfile } from '../features/patient-profile/hooks/usePatientProfile';
import { DashboardLayout } from './DashboardLayout';

/**
 * Perfil del paciente (ENG-47).
 *
 * Dos columnas: el formulario a la izquierda y la cuenta a la derecha. Antes era
 * una sola columna de 840 px dentro de un área de 1440, así que en un monitor
 * ancho quedaba media pantalla vacía al costado de cinco campos.
 *
 * La columna de la derecha no es relleno: contesta lo que uno viene a chequear
 * cuando entra al perfil —con qué email entro, qué rol tengo, y si esto ya está
 * listo o me falta algo—, y deja el formulario para lo único que se edita.
 */
export function PatientProfilePage() {
  const { user } = useSession();
  const perfil = useMyProfile();

  const nombre =
    [perfil.data?.firstName, perfil.data?.lastName].filter(Boolean).join(' ') ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    'Tu perfil';
  const iniciales =
    ((perfil.data?.firstName ?? user?.firstName)?.charAt(0) ?? '') +
      ((perfil.data?.lastName ?? user?.lastName)?.charAt(0) ?? '') || '·';
  const completo = perfil.data?.completed ?? false;

  return (
    <DashboardLayout barTitle="Mi perfil">
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <PatientProfileForm />

        <aside className="grid gap-4 xl:sticky xl:top-24">
          <section className="overflow-hidden rounded-[14px] border border-line bg-white">
            <div className="grid justify-items-center gap-3 px-6 py-7 text-center">
              <span
                aria-hidden="true"
                className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-brand-hover text-[21px] font-bold text-white"
              >
                {iniciales.toUpperCase()}
              </span>
              <p className="font-display text-[24px] leading-[1.15] text-brand-deep">
                {nombre}
              </p>

              {!perfil.isPending && (
                <p
                  className={`rounded-full px-3.5 py-1.5 text-[12px] font-bold ${
                    completo ? 'bg-surface-teal text-brand-hover' : 'bg-danger/10 text-danger'
                  }`}
                >
                  {completo ? 'Perfil completo' : 'Falta completar'}
                </p>
              )}
            </div>

            <dl className="divide-y divide-line-soft border-t border-line-soft">
              <Dato titulo="Email">{user?.email ?? '—'}</Dato>
              <Dato titulo="Rol">Paciente</Dato>
            </dl>

            {/* El email es la identidad de la cuenta y lo administra Supabase
                Auth: cambiarlo pide verificar el nuevo, que es otra historia. Se
                dice para que no parezca un dato que falta cargar. */}
            <p className="border-t border-line-soft bg-surface px-6 py-3 text-[11px] leading-[1.6] text-muted-soft">
              El email es con el que entrás; por ahora no se puede cambiar.
            </p>
          </section>

          <section className="overflow-hidden rounded-[14px] border border-line bg-white">
            <header className="border-b border-line-soft px-6 py-[18px]">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Para qué sirve
              </h2>
            </header>

            {/* Las dos son reglas reales del backend, no promesas: sin la fila en
                `patients` la reserva responde 409, y el DNI es lo que ata cada
                asiento de la historia clínica a una persona. */}
            <ul className="grid gap-4 px-6 py-5">
              <Uso titulo="Reservar turnos">
                Sin tus datos cargados, el sistema no te deja confirmar una consulta.
              </Uso>
              <Uso titulo="Que te identifiquen bien">
                Tu DNI es lo que ata cada registro de tu historia clínica a vos y no a otra
                persona.
              </Uso>
            </ul>

            {completo && (
              <div className="border-t border-line-soft px-6 py-4">
                <Link
                  to="/buscar"
                  className="text-[13px] font-bold text-brand-hover underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  Buscar un profesional →
                </Link>
              </div>
            )}
          </section>
        </aside>
      </div>
    </DashboardLayout>
  );
}

function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-6 py-3.5">
      <dt className="text-[13px] text-muted">{titulo}</dt>
      <dd className="min-w-0 truncate text-[13px] font-semibold text-ink">{children}</dd>
    </div>
  );
}

function Uso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <li>
      <p className="text-[13px] font-bold text-brand-deep">{titulo}</p>
      <p className="mt-1 text-[13px] leading-[1.6] text-muted">{children}</p>
    </li>
  );
}
