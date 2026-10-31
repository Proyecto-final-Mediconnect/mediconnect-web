import { useSession } from '../features/auth/hooks/useSession';
import { AccessHistory } from '../features/medipass/components/AccessHistory';
import { ActiveAccesses } from '../features/medipass/components/ActiveAccesses';
import { EmergencyData } from '../features/medipass/components/EmergencyData';
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
 * Arriba, el pase (QR, código y cuánto le queda) y quién lo está mirando ahora,
 * con la opción de cortarlo (ENG-74, ENG-75). Abajo, los datos de emergencia
 * (`GET /medipass/me/vital`): qué se ve, editarlos y la ficha del médico, y el
 * historial de accesos.
 */
/** El código rota cada 5 minutos (ENG-72): es lo que llena la barra. */
const CODIGO_MS = 5 * 60_000;

export function MediPassPage() {
  const { user } = useSession();
  const now = useNow(1000);
  const codigo = useMyMediPassCode();
  const vital = useMyVitalBlock();

  const nombre = user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : '';
  const restante = codigo.data ? new Date(codigo.data.expiraEl).getTime() - now.getTime() : 0;

  return (
    <DashboardLayout barTitle="MediPass" subtitle="Tu pasaporte médico para una emergencia.">
      <div className="grid gap-6">
        {/* Arriba, lo que se usa en la guardia: el pase (QR, código y cuánto le
            queda) y, al lado en pantallas anchas, quién lo está mirando. */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section
            aria-labelledby="codigo"
            className="grid gap-6 rounded-[18px] border border-line bg-white p-5 sm:p-6 md:grid-cols-[auto_minmax(0,1fr)] md:items-center md:gap-8"
          >
            <div className="justify-self-center rounded-[14px] border border-line bg-white p-3 shadow-[0_18px_40px_-28px_rgba(7,45,61,0.45)]">
              {codigo.isPending ? (
                <div className="grid size-[208px] place-items-center rounded-[10px] bg-surface">
                  <p role="status" className="text-[13px] text-muted">
                    Generando tu código…
                  </p>
                </div>
              ) : codigo.isError ? (
                <div
                  role="alert"
                  className="grid size-[208px] content-center justify-items-center gap-3 px-3 text-center"
                >
                  <p className="text-[13px] text-danger">{codigo.error.message}</p>
                  <button
                    type="button"
                    onClick={() => void codigo.refetch()}
                    className="rounded-full bg-brand-deep px-4 py-2 text-sm font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                  >
                    Probá de nuevo
                  </button>
                </div>
              ) : (
                <MediPassQr
                  value={emergencyUrl(window.location.origin, codigo.data.codigo)}
                  size={208}
                />
              )}
            </div>

            <div className="grid gap-4 text-center md:text-left">
              <div>
                <h2
                  id="codigo"
                  className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-hover"
                >
                  Tu MediPass{nombre ? ` · ${nombre}` : ''}
                </h2>
                <p className="mt-2 font-mono text-[30px] font-bold leading-none tracking-[0.12em] text-brand-deep sm:text-[34px]">
                  {codigo.data ? formatCodigo(codigo.data.codigo) : '····-····'}
                </p>
              </div>

              {codigo.data && (
                <div className="grid gap-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-line-soft">
                    <div
                      className="h-full rounded-full bg-brand transition-[width] duration-1000 ease-linear"
                      style={{
                        width: `${Math.max(0, Math.min(100, (restante / CODIGO_MS) * 100))}%`,
                      }}
                    />
                  </div>
                  {/* El contador explica por qué el código cambia: sin él, alguien
                      que vuelve a mirar cree que se rompió algo. */}
                  <p
                    role="timer"
                    aria-label={`El código se renueva en ${cuentaRegresiva(restante)}`}
                    className="text-[13px] text-muted"
                  >
                    {restante > 0 ? (
                      <>
                        Se renueva en{' '}
                        <span className="font-semibold tabular-nums text-brand-deep">
                          {cuentaRegresiva(restante)}
                        </span>
                      </>
                    ) : (
                      'Renovando…'
                    )}
                  </p>
                </div>
              )}

              <p className="text-[14px] leading-[1.6] text-muted">
                Mostraselo a un médico de guardia: lo escanea con la cámara y ve tu información
                vital durante 30 minutos, sin instalar nada.
              </p>

              <ul className="flex flex-wrap justify-center gap-2 md:justify-start">
                {[
                  'El código cambia cada 5 minutos',
                  'Cada acceso dura 30 minutos',
                  'Queda registrado quién entró',
                ].map((dato) => (
                  <li
                    key={dato}
                    className="inline-flex items-center gap-1.5 rounded-full bg-surface-teal px-3 py-1 text-xs font-semibold text-brand-hover"
                  >
                    <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
                    {dato}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Al lado del pase: quien lo escaneó aparece acá, y se puede cortar. */}
          <ActiveAccesses />
        </div>

        {/* Abajo: tus datos de emergencia (qué se ve y editarlos) y quién entró. */}
        <div className="grid items-start gap-6 lg:grid-cols-2">
          {vital.isPending ? (
            <p role="status" className="text-[14px] text-muted">
              Cargando tu información vital…
            </p>
          ) : vital.isError ? (
            <p role="alert" className="text-[14px] font-semibold text-danger">
              {vital.error.message}
            </p>
          ) : (
            <EmergencyData vital={vital.data} />
          )}

          <AccessHistory />
        </div>
      </div>
    </DashboardLayout>
  );
}
