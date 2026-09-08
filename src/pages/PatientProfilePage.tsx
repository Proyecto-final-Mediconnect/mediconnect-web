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

  /** Campos vacíos, nombrados igual que sus etiquetas en el formulario para que
   *  la lista se pueda seguir sin traducir nada. */
  const faltantes = perfil.data
    ? (
        [
          ['Nombre', perfil.data.firstName],
          ['Apellido', perfil.data.lastName],
          ['Fecha de nacimiento', perfil.data.birthDate],
          ['DNI', perfil.data.dni],
          ['Teléfono', perfil.data.phone],
        ] as const
      )
        .filter(([, valor]) => !valor)
        .map(([etiqueta]) => etiqueta)
    : [];

  return (
    <DashboardLayout barTitle="Mi perfil">
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <PatientProfileForm />

        <aside className="grid gap-4 xl:sticky xl:top-24">
          <section className="overflow-hidden rounded-[14px] border border-line bg-white">
            {/* Identidad en una fila y no centrada en una columna: el bloque
                mostraba dos datos y ocupaba media pantalla de alto. */}
            <div className="flex items-center gap-3.5 px-5 py-5">
              <span
                aria-hidden="true"
                className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-full bg-brand-hover text-[18px] font-bold text-white"
              >
                {iniciales.toUpperCase()}
              </span>

              <div className="min-w-0">
                <p className="truncate font-display text-[21px] leading-[1.2] text-brand-deep">
                  {nombre}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[12px] text-muted">Paciente</span>
                  {!perfil.isPending && (
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        completo ? 'bg-surface-teal text-brand-hover' : 'bg-danger/10 text-danger'
                      }`}
                    >
                      {completo ? 'Perfil completo' : 'Falta completar'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* El email va apilado y no en una fila `etiqueta | valor`: en una
                columna de 340 px un mail largo quedaba pegado a su propia
                etiqueta y recortado con puntos suspensivos, que es justo el dato
                que uno viene a leer entero. */}
            <div className="border-t border-line-soft px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                Email
              </p>
              <p className="mt-1.5 break-all text-[13px] font-semibold text-ink">
                {user?.email ?? '—'}
              </p>
            </div>
          </section>

          {/* Qué falta, no para qué sirve.

              Antes acá había una tarjeta explicando que el perfil sirve para
              reservar turnos y para que te identifiquen bien. Es cierto y es
              obvio: nadie entra a "Mi perfil" a enterarse de qué es un perfil.
              Esto, en cambio, contesta lo único que uno no sabe mirando el
              formulario largo —qué le falta— y desaparece cuando no falta nada. */}
          {faltantes.length > 0 && (
            <section className="overflow-hidden rounded-[14px] border border-danger/25 bg-white">
              <header className="border-b border-line-soft px-5 py-[15px]">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-danger">
                  Falta cargar
                </h2>
              </header>

              <ul className="grid gap-2 px-5 py-4">
                {faltantes.map((campo) => (
                  <li key={campo} className="flex items-center gap-2.5 text-[13px] text-ink">
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 flex-none rounded-full bg-danger"
                    />
                    {campo}
                  </li>
                ))}
              </ul>

              {/* La única consecuencia real de tener el perfil incompleto, y no
                  es una advertencia inventada: sin la fila en `patients`, el
                  backend responde 409 al reservar. */}
              <p className="border-t border-line-soft px-5 py-3.5 text-[12px] leading-[1.6] text-muted">
                Hasta completarlo no vas a poder confirmar un turno.
              </p>
            </section>
          )}

          {completo && (
            <section className="rounded-[14px] border border-line bg-white px-5 py-4">
              <Link
                to="/buscar"
                className="text-[13px] font-bold text-brand-hover underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Buscar un profesional →
              </Link>
            </section>
          )}
        </aside>
      </div>
    </DashboardLayout>
  );
}
