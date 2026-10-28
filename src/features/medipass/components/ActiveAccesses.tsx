import { useState } from 'react';
import { useNow } from '../../../shared/hooks/useNow';
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog';
import { useMyActiveAccesses, useRevokeAccess } from '../hooks/useMediPass';
import { cuentaRegresiva } from '../lib/medipass';
import type { MediPassActiveAccess } from '../types/medipass';

/**
 * Quién está mirando el MediPass ahora (ENG-74) y la opción de cortarlo
 * (ENG-75). Es la mitad visible de lo que el MediPass promete: sin esta lista,
 * el paciente puede tener un acceso abierto y no saberlo.
 *
 * Cortar uno no corta los demás: cada canje del código abre su propia sesión,
 * así que en una guardia con dos médicos mirando se le saca el acceso a uno sin
 * dejar afuera al otro. La ficha del que se cortó se cierra en su próximo
 * refresco (el backend le responde 410).
 */
export function ActiveAccesses() {
  const accesos = useMyActiveAccesses();
  const revocar = useRevokeAccess();
  const now = useNow(1000);
  const [aCortar, setACortar] = useState<MediPassActiveAccess | null>(null);

  // El backend ya los filtra; esto cubre el que vence entre dos consultas.
  const abiertos = (accesos.data ?? []).filter(
    (a) => new Date(a.expiraEl).getTime() > now.getTime(),
  );

  const cerrar = () => {
    setACortar(null);
    revocar.reset();
  };

  return (
    <section
      aria-labelledby="accediendo"
      className="overflow-hidden rounded-[14px] border border-line bg-white"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line-soft px-5 py-4">
        <h2 id="accediendo" className="text-[15px] font-bold text-brand-deep">
          Accediendo ahora
        </h2>
        {abiertos.length > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-teal px-2.5 py-1 text-xs font-semibold text-brand-hover">
            <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-brand" />
            En vivo
          </span>
        )}
      </div>

      {accesos.isPending ? (
        <p role="status" className="px-5 py-4 text-[13px] text-muted">
          Buscando accesos abiertos…
        </p>
      ) : accesos.isError ? (
        <div role="alert" className="grid gap-2 px-5 py-4">
          <p className="text-[13px] text-danger">{accesos.error.message}</p>
          <button
            type="button"
            onClick={() => void accesos.refetch()}
            className="justify-self-start text-[13px] font-semibold text-brand-deep underline underline-offset-2"
          >
            Reintentar
          </button>
        </div>
      ) : abiertos.length === 0 ? (
        <p className="px-5 py-4 text-[13px] leading-[1.6] text-muted">
          Nadie está mirando tu MediPass en este momento.
        </p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {abiertos.map((acceso) => (
            <li key={acceso.id} className="flex items-center gap-3 px-5 py-3.5">
              <span aria-hidden="true" className="size-2 flex-none rounded-full bg-brand" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-brand-deep">
                  {acceso.consultante}
                </span>
                <span className="block truncate text-[13px] text-muted">
                  Entró con tu código
                  {acceso.matricula ? ` · Matrícula ${acceso.matricula}` : ''}
                </span>
                <span className="block text-xs text-muted-soft">
                  Se corta solo en{' '}
                  {cuentaRegresiva(new Date(acceso.expiraEl).getTime() - now.getTime())}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setACortar(acceso)}
                aria-label={`Revocar el acceso de ${acceso.consultante}`}
                className="flex-none rounded-full border border-line-strong px-3.5 py-1.5 text-[13px] font-semibold text-brand-deep transition-colors hover:border-danger hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                Revocar
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={aCortar !== null}
        titulo="¿Revocar el acceso?"
        confirmar="Revocar acceso"
        cancelar="Dejar que siga viendo"
        destructivo
        pendiente={revocar.isPending}
        onCancel={cerrar}
        onConfirm={() => {
          if (aCortar) revocar.mutate(aCortar.id, { onSuccess: cerrar });
        }}
      >
        <p>
          {aCortar?.consultante} deja de ver tu MediPass en este momento. Si lo necesita de nuevo,
          vas a tener que mostrarle el código otra vez.
        </p>
        {revocar.isError && (
          <p role="alert" className="mt-2 text-danger">
            {revocar.error.message}
          </p>
        )}
      </ConfirmDialog>
    </section>
  );
}
