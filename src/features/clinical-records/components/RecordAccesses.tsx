import { useState } from 'react';
import { useMyClinicalRecordAccesses } from '../hooks/useClinicalRecord';

const CUANDO = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * Quién vio mi historia clínica (ENG-165): los profesionales que la abrieron,
 * del más reciente al más viejo. Sale de `audit_logs`, que registra cada
 * lectura y no se puede borrar ni editar (ENG-87).
 *
 * Colapsada por defecto: es para chequear de vez en cuando, no lo primero que
 * se busca al abrir la historia. Pide la lista recién al abrirla.
 */
export function RecordAccesses() {
  const [abierta, setAbierta] = useState(false);
  const [pagina, setPagina] = useState(1);
  const accesos = useMyClinicalRecordAccesses(pagina, abierta);

  return (
    <section className="overflow-hidden rounded-[14px] border border-line bg-white print:hidden">
      <button
        type="button"
        aria-expanded={abierta}
        aria-controls="quien-vio"
        onClick={() => setAbierta((v) => !v)}
        className="flex w-full items-center gap-3.5 px-5 py-4 text-left transition-colors hover:bg-surface focus:outline-none focus-visible:bg-surface"
      >
        <span
          aria-hidden="true"
          className="grid size-9 flex-none place-items-center rounded-full bg-surface-teal text-brand-hover"
        >
          <svg
            viewBox="0 0 20 20"
            className="size-[18px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path
              d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10Z"
              strokeLinejoin="round"
            />
            <circle cx="10" cy="10" r="2.3" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold text-brand-deep">
            Quién vio mi historia clínica
          </span>
          <span className="block text-[13px] text-muted">
            Cada vez que un profesional la abre queda registrado, y nadie lo puede borrar.
          </span>
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={`size-4 flex-none text-muted-soft transition-transform ${abierta ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {abierta && (
        <div id="quien-vio" className="border-t border-line-soft">
          {accesos.isPending ? (
            <p role="status" className="px-5 py-4 text-[13px] text-muted">
              Buscando los accesos…
            </p>
          ) : accesos.isError ? (
            // El mensaje del servidor puede ser técnico ("Cannot GET …"): al
            // paciente le sirve saber que falló y cómo reintentar.
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <p className="text-[13px] text-danger">
                No pudimos cargar quién vio tu historia clínica.
              </p>
              <button
                type="button"
                onClick={() => void accesos.refetch()}
                className="rounded-full border border-line-strong px-3.5 py-1.5 text-[13px] font-semibold text-brand-deep transition-colors hover:border-brand hover:bg-surface-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Probá de nuevo
              </button>
            </div>
          ) : accesos.data.accesos.length === 0 ? (
            <p className="px-5 py-5 text-[13px] leading-[1.6] text-muted">
              Todavía nadie más que vos abrió tu historia clínica.
            </p>
          ) : (
            <>
              <ul className="divide-y divide-line-soft" aria-busy={accesos.isFetching}>
                {accesos.data.accesos.map((acceso) => (
                  <li key={acceso.id} className="flex items-center gap-3.5 px-5 py-3">
                    <span
                      aria-hidden="true"
                      className="grid size-9 flex-none place-items-center rounded-full bg-surface-teal text-[12px] font-bold text-brand-deep"
                    >
                      {iniciales(acceso.profesional?.nombre)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-brand-deep">
                        {acceso.profesional?.nombre ?? 'Un profesional sin perfil'}
                      </span>
                      <span className="block truncate text-[12px] text-muted">
                        {[
                          acceso.profesional?.especialidad,
                          acceso.profesional && `Matrícula ${acceso.profesional.matricula}`,
                        ]
                          .filter(Boolean)
                          .join(' · ') || 'Abrió tu historia clínica'}
                      </span>
                    </span>
                    <time
                      dateTime={acceso.el}
                      className="flex-none text-right text-[12px] tabular-nums text-muted-soft"
                    >
                      {CUANDO.format(new Date(acceso.el))}
                    </time>
                  </li>
                ))}
              </ul>
              {(pagina > 1 || accesos.data.hayMas) && (
                <div className="flex items-center justify-between gap-3 border-t border-line-soft px-5 py-3">
                  <button
                    type="button"
                    onClick={() => setPagina((p) => p - 1)}
                    disabled={pagina === 1}
                    className={PAGINA}
                  >
                    ← Más recientes
                  </button>
                  <span className="text-[12px] text-muted">Página {pagina}</span>
                  <button
                    type="button"
                    onClick={() => setPagina((p) => p + 1)}
                    disabled={!accesos.data.hayMas}
                    className={PAGINA}
                  >
                    Más viejos →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function iniciales(nombre: string | undefined): string {
  if (!nombre) return '·';
  const partes = nombre.split(' ').filter(Boolean);
  return ((partes[0]?.[0] ?? '') + (partes.at(-1)?.[0] ?? '')).toUpperCase();
}

const PAGINA =
  'rounded-full border border-line-strong px-3.5 py-1.5 text-[13px] font-semibold text-brand-deep transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-40';
