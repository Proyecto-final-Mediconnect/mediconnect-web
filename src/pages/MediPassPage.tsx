import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../features/auth/hooks/useSession';
import {
  EMERGENCY_SCOPES,
  MEDIPASS_EMITIDO,
  MEDIPASS_PREFIJO,
  mockAccesses,
} from '../features/medipass/lib/mockMediPass';
import {
  ROTACION_MS,
  SESION_MS,
  accesosVigentes,
  cuentaRegresiva,
  estadoDeAcceso,
  msHastaRotacion,
} from '../features/medipass/lib/medipass';
import type { EmergencyScope, MediPassAccess } from '../features/medipass/types/medipass';
import { useNow } from '../shared/hooks/useNow';
import { MediPassQr } from '../shared/ui/MediPassQr';
import { DashboardLayout } from './DashboardLayout';

/**
 * MediPass — gestión de accesos (EP-05, Release 3).
 *
 * ⚠️ **El MediPass no existe en el backend.** Ni tabla, ni servicio, ni endpoint;
 * y buena parte del bloque vital ni siquiera tiene dónde guardarse: el perfil de
 * paciente son cinco campos y no incluye grupo sanguíneo, alergias ni contacto de
 * emergencia. Todo está en `lib/mockMediPass`, con la lista de lo que falta.
 *
 * **El código rota, y eso no sale del canvas sino de ENG-72.** El canvas dibuja
 * un código fijo; el ticket pide uno que rote cada 5 minutos. Es una diferencia de
 * seguridad, no de estilo: un código fijo es una credencial permanente —quien lo
 * vio una vez entra para siempre— y por eso acá se muestra con su cuenta
 * regresiva. Los 30 minutos de cada acceso son los de ENG-104.
 */
export function MediPassPage() {
  const { user } = useSession();
  const now = useNow(1000);
  const [scopes, setScopes] = useState<EmergencyScope[]>(['VITAL', 'CONDICIONES']);
  const [accesos, setAccesos] = useState<MediPassAccess[]>(() => mockAccesses());

  const nombre = user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : 'Tu';
  const vigentes = accesosVigentes(accesos, now);

  // El sufijo cambia con la ventana de rotación: es teatro, pero teatro del
  // comportamiento correcto — se ve que el código de recién ya no sirve.
  const ventana = Math.floor(now.getTime() / ROTACION_MS);
  const codigo = `${MEDIPASS_PREFIJO}-${String(ventana % 10000).padStart(4, '0')}-${String(
    (ventana * 7) % 10000,
  ).padStart(4, '0')}`;

  return (
    <DashboardLayout
      barTitle="MediPass"
      subtitle="Tu pasaporte médico. Vos decidís quién ve tu historia, qué parte y por cuánto tiempo — y podés cortar cualquier acceso en el momento."
    >
      <div className="grid gap-5">
        <p className="rounded-[14px] border border-dashed border-line-strong bg-surface px-5 py-4 text-[13px] leading-[1.7] text-muted">
          <strong className="font-bold text-brand-deep">Pantalla de ejemplo.</strong> El
          MediPass es Release 3 y todavía no existe del lado del servidor: el código no es
          real, los accesos son de muestra y revocarlos no corta nada.
        </p>

        <div className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          <section
            aria-labelledby="codigo"
            className="overflow-hidden rounded-[14px] border border-night bg-night text-white"
          >
            <div className="grid justify-items-center gap-4 px-6 py-7">
              <h2
                id="codigo"
                className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-bright"
              >
                Tu MediPass
              </h2>

              <div className="rounded-[10px] bg-white p-2.5">
                <MediPassQr size={148} />
              </div>

              <p className="text-center font-mono text-[15px] font-bold tracking-[0.06em] text-white">
                {codigo}
              </p>

              {/* El contador es la explicación de por qué el código cambia: sin
                  él, alguien que vuelve a mirar cree que se rompió algo. */}
              <p
                role="timer"
                aria-label={`El código se renueva en ${cuentaRegresiva(msHastaRotacion(now))}`}
                className="text-[12px] text-on-night"
              >
                Se renueva en{' '}
                <span className="font-bold tabular-nums text-brand-bright">
                  {cuentaRegresiva(msHastaRotacion(now))}
                </span>
              </p>

              <p className="text-center text-[12px] text-on-night-soft">
                {nombre} · emitido en {MEDIPASS_EMITIDO}
              </p>
            </div>

            <div className="grid gap-3 border-t border-white/10 px-6 py-5">
              <button
                type="button"
                disabled
                title="Compartir accesos llega con el MediPass (ENG-73)"
                className="rounded-[9px] bg-brand py-3 text-sm font-bold text-ink-deep disabled:cursor-not-allowed disabled:opacity-50"
              >
                Compartir acceso temporal
              </button>
              <Link
                to="/medipass/emergencia"
                className="text-center text-[13px] font-semibold text-brand-bright underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright"
              >
                Ver cómo lo lee un médico en el exterior →
              </Link>
            </div>
          </section>

          <div className="grid gap-5">
            <QuienTieneAcceso
              accesos={accesos}
              vigentes={vigentes.length}
              now={now}
              onRevocar={(id) => setAccesos((prev) => prev.filter((a) => a.id !== id))}
            />

            <QueSeVe scopes={scopes} onChange={setScopes} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function QuienTieneAcceso({
  accesos,
  vigentes,
  now,
  onRevocar,
}: {
  accesos: MediPassAccess[];
  vigentes: number;
  now: Date;
  onRevocar: (id: string) => void;
}) {
  return (
    <section
      aria-labelledby="accesos"
      className="overflow-hidden rounded-[14px] border border-line bg-white"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-6 py-[18px]">
        <h2 id="accesos" className="text-[17px] font-bold text-brand-deep">
          Quién tiene acceso hoy
        </h2>
        <p className="text-[13px] font-semibold text-muted">
          {vigentes} acceso{vigentes === 1 ? '' : 's'} vigente{vigentes === 1 ? '' : 's'}
        </p>
      </header>

      {accesos.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-muted">
          Nadie está mirando tu historia.
        </p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {accesos.map((acceso) => {
            const estado = estadoDeAcceso(acceso, now);

            return (
              <li
                key={acceso.id}
                className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"
              >
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-brand-deep">{acceso.quien}</p>
                  <p className="mt-1 text-[13px] text-muted">{acceso.contexto}</p>
                  <p className="mt-1.5 text-[12px] text-muted-soft">
                    {estado.estado === 'VIGENTE' ? (
                      <>
                        Se corta solo en{' '}
                        <span className="font-semibold tabular-nums text-brand-hover">
                          {cuentaRegresiva(estado.msRestantes)}
                        </span>
                      </>
                    ) : (
                      'Ya expiró'
                    )}
                  </p>
                </div>

                {estado.estado === 'VIGENTE' && (
                  <button
                    type="button"
                    onClick={() => onRevocar(acceso.id)}
                    aria-label={`Revocar el acceso de ${acceso.quien}`}
                    className="rounded-[8px] border border-line-strong bg-white px-4 py-2 text-[13px] font-bold text-brand-deep transition-colors hover:border-danger hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    Revocar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="border-t border-dashed border-line-strong bg-surface px-6 py-3 text-[11px] leading-[1.6] text-muted-soft">
        Accesos de ejemplo. Cada uno dura {SESION_MS / 60_000} minutos y se corta solo
        (ENG-104); revocar acá todavía no corta nada de verdad.
      </p>
    </section>
  );
}

function QueSeVe({
  scopes,
  onChange,
}: {
  scopes: EmergencyScope[];
  onChange: (scopes: EmergencyScope[]) => void;
}) {
  function toggle(id: EmergencyScope, activo: boolean) {
    onChange(activo ? [...scopes, id] : scopes.filter((s) => s !== id));
  }

  return (
    <section
      aria-labelledby="alcance"
      className="overflow-hidden rounded-[14px] border border-line bg-white"
    >
      <header className="border-b border-line-soft px-6 py-[18px]">
        <h2 id="alcance" className="text-[17px] font-bold text-brand-deep">
          Qué se muestra en una emergencia
        </h2>
        <p className="mt-1.5 max-w-[560px] text-[13px] leading-[1.6] text-muted">
          Si alguien escanea tu código sin tu autorización expresa, solo ve lo que dejes
          activado acá.
        </p>
      </header>

      <ul className="divide-y divide-line-soft">
        {EMERGENCY_SCOPES.map((scope) => (
          <li key={scope.id} className="px-6 py-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={scope.fijo || scopes.includes(scope.id)}
                disabled={scope.fijo}
                onChange={(e) => toggle(scope.id, e.target.checked)}
                className="mt-0.5 size-[17px] accent-brand disabled:opacity-60"
              />
              <span className="min-w-0">
                <span className="block text-[14px] font-bold text-brand-deep">
                  {scope.label}
                </span>
                <span className="mt-1 block text-[13px] leading-[1.6] text-muted">
                  {scope.detalle}
                </span>
                {/* Que esté fijo necesita explicación: si no, se lee como un
                    control roto en vez de una decisión. */}
                {scope.fijo && (
                  <span className="mt-1.5 block text-[12px] font-semibold text-brand-hover">
                    Siempre visible: sin esto el MediPass no sirve en una guardia.
                  </span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
