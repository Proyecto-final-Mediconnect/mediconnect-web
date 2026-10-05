import { useSession } from '../features/auth/hooks/useSession';
import { VitalBlockCard } from '../features/medipass/components/VitalBlockCard';
import { useMyMediPassCode, useMyVitalBlock } from '../features/medipass/hooks/useMediPass';
import { cuentaRegresiva, emergencyUrl, formatCodigo } from '../features/medipass/lib/medipass';
import { useNow } from '../shared/hooks/useNow';
import { MediPassQr } from '../shared/ui/MediPassQr';
import { DashboardLayout } from './DashboardLayout';

/**
 * MediPass del paciente (EP-05, ENG-135).
 *
 * El código sale de `GET /medipass/me` y rota (ENG-72): el QR y la cuenta
 * regresiva muestran el vigente y se piden de nuevo justo cuando vence. Un código
 * fijo sería una credencial permanente —quien lo vio una vez entraría para
 * siempre—.
 *
 * **El QR codifica la URL de la vista de emergencia con el código**, así un
 * médico lo abre con la cámara del celular sin instalar nada.
 *
 * Al lado, el bloque vital tal como lo va a leer quien escanee
 * (`GET /medipass/me/vital`): el paciente sabe exactamente qué muestra.
 */
export function MediPassPage() {
  const { user } = useSession();
  const now = useNow(1000);
  const codigo = useMyMediPassCode();
  const vital = useMyVitalBlock();

  const nombre = user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : '';
  const restante = codigo.data ? new Date(codigo.data.expiraEl).getTime() - now.getTime() : 0;

  return (
    <DashboardLayout
      barTitle="MediPass"
      subtitle="Tu pasaporte médico. Mostrale este código a un médico de guardia: lo escanea con la cámara y ve tu información vital durante 30 minutos."
    >
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

            {codigo.isPending ? (
              <div className="grid size-[168px] place-items-center rounded-[10px] bg-white/10">
                <p role="status" className="text-[13px] text-on-night">
                  Generando tu código…
                </p>
              </div>
            ) : codigo.isError ? (
              <div role="alert" className="grid gap-3 text-center">
                <p className="text-[14px] text-on-night">{codigo.error.message}</p>
                <button
                  type="button"
                  onClick={() => void codigo.refetch()}
                  className="rounded-[9px] bg-brand px-4 py-2.5 text-sm font-bold text-ink-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright"
                >
                  Probá de nuevo
                </button>
              </div>
            ) : (
              <>
                <div className="rounded-[10px] bg-white p-2.5">
                  <MediPassQr
                    value={emergencyUrl(window.location.origin, codigo.data.codigo)}
                    size={148}
                  />
                </div>

                <p className="text-center font-mono text-[18px] font-bold tracking-[0.12em] text-white">
                  {formatCodigo(codigo.data.codigo)}
                </p>

                {/* El contador explica por qué el código cambia: sin él, alguien
                    que vuelve a mirar cree que se rompió algo. */}
                <p
                  role="timer"
                  aria-label={`El código se renueva en ${cuentaRegresiva(restante)}`}
                  className="text-[12px] text-on-night"
                >
                  {restante > 0 ? (
                    <>
                      Se renueva en{' '}
                      <span className="font-bold tabular-nums text-brand-bright">
                        {cuentaRegresiva(restante)}
                      </span>
                    </>
                  ) : (
                    'Renovando…'
                  )}
                </p>
              </>
            )}

            {nombre && <p className="text-center text-[12px] text-on-night-soft">{nombre}</p>}
          </div>

          <p className="border-t border-white/10 px-6 py-4 text-[12px] leading-[1.6] text-on-night-soft">
            Cada acceso queda registrado a nombre de quien escaneó tu código y se corta solo a los
            30 minutos.
          </p>
        </section>

        <section aria-labelledby="vista" className="grid gap-3">
          <div>
            <h2 id="vista" className="text-[17px] font-bold text-brand-deep">
              Lo que ve quien escanea tu código
            </h2>
            <p className="mt-1 text-[13px] leading-[1.6] text-muted">
              Solo tu información vital, en inglés por si la guardia es en el exterior. Tus
              consultas y estudios no se muestran.
            </p>
          </div>

          {vital.isPending ? (
            <p role="status" className="text-[14px] text-muted">
              Cargando tu información vital…
            </p>
          ) : vital.isError ? (
            <p role="alert" className="text-[14px] font-semibold text-danger">
              {vital.error.message}
            </p>
          ) : (
            <VitalBlockCard vital={vital.data} />
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
