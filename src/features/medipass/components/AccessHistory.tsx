import { useState } from 'react';
import { useMyMediPassHistory } from '../hooks/useMediPass';
import type { MediPassAccess, MediPassAccessStatus } from '../types/medipass';

const WHEN = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const TIME = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const STATUS: Record<MediPassAccessStatus, { label: string; className: string }> = {
  ACTIVO: { label: 'Abierto ahora', className: 'bg-brand/15 text-brand-hover' },
  VENCIDO: { label: 'Cerrado', className: 'bg-surface text-muted' },
  REVOCADO: { label: 'Lo cortaste vos', className: 'bg-danger/10 text-danger' },
};

/**
 * Historial de accesos al MediPass (HU-38, ENG-76): quién abrió el código,
 * cuándo y qué miró.
 *
 * Es la otra mitad del control que promete el MediPass. Compartir el código en
 * una guardia sirve si después el paciente puede ver qué se hizo con él: sin
 * esto, "cada acceso queda registrado" sería una promesa que no puede revisar.
 */
export function AccessHistory() {
  const [pagina, setPagina] = useState(1);
  const history = useMyMediPassHistory(pagina);

  return (
    <section aria-labelledby="historial" className="grid gap-3">
      <div>
        <h2 id="historial" className="text-[17px] font-bold text-brand-deep">
          Quién abrió tu MediPass
        </h2>
        <p className="mt-1 text-[13px] leading-[1.6] text-muted">
          Cada vez que alguien usa tu código queda registrado acá, con su nombre, su matrícula si la
          dio, y qué información vio.
        </p>
      </div>

      {history.isPending ? (
        <p role="status" className="text-[14px] text-muted">
          Cargando el historial…
        </p>
      ) : history.isError ? (
        <p role="alert" className="text-[14px] font-semibold text-danger">
          {history.error.message}
        </p>
      ) : history.data.accesos.length === 0 && pagina === 1 ? (
        <p className="rounded-[14px] border border-line bg-white px-6 py-5 text-[14px] text-muted">
          Nadie abrió tu MediPass todavía.
        </p>
      ) : (
        <>
          <ul className="grid gap-3" aria-busy={history.isFetching}>
            {history.data.accesos.map((acceso) => (
              <AccessItem key={acceso.sesionId} acceso={acceso} />
            ))}
          </ul>

          {(pagina > 1 || history.data.hayMas) && (
            <nav
              aria-label="Páginas del historial"
              className="flex items-center justify-between gap-3"
            >
              <button
                type="button"
                onClick={() => setPagina((p) => p - 1)}
                disabled={pagina === 1 || history.isFetching}
                className="rounded-[9px] border border-line-strong bg-white px-4 py-2 text-[13px] font-bold text-brand-deep disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                ← Más recientes
              </button>
              <span className="text-[13px] text-muted">Página {pagina}</span>
              <button
                type="button"
                onClick={() => setPagina((p) => p + 1)}
                disabled={!history.data.hayMas || history.isFetching}
                className="rounded-[9px] border border-line-strong bg-white px-4 py-2 text-[13px] font-bold text-brand-deep disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Anteriores →
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

function AccessItem({ acceso }: { acceso: MediPassAccess }) {
  const status = STATUS[acceso.estado];
  const quien = acceso.consultante.nombre ?? 'Alguien sin identificarse';

  return (
    <li className="rounded-[14px] border border-line bg-white px-6 py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-brand-deep">{quien}</p>
          <p className="mt-0.5 text-[13px] text-muted">
            {acceso.consultante.matricula
              ? `Matrícula ${acceso.consultante.matricula}`
              : 'No dio matrícula'}{' '}
            · {WHEN.format(new Date(acceso.inicio))}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em] ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      {acceso.vistas.length > 0 && (
        <ul
          aria-label={`Lo que vio ${quien}`}
          className="mt-3 grid gap-1.5 border-t border-line pt-3"
        >
          {acceso.vistas.map((vista, i) => (
            <li key={`${vista.el}-${i}`} className="flex gap-3 text-[13px]">
              <span className="w-12 flex-none tabular-nums text-muted">
                {TIME.format(new Date(vista.el))}
              </span>
              <span className="text-ink">{vista.etiqueta}</span>
            </li>
          ))}
        </ul>
      )}

      {acceso.revocadoEl && (
        <p className="mt-3 text-[12px] text-danger">
          Cortaste el acceso a las {TIME.format(new Date(acceso.revocadoEl))}.
        </p>
      )}
    </li>
  );
}
