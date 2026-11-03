import { useState } from 'react';
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog';
import { useMyDocuments, useOpenDocument, useWithdrawDocument } from '../hooks/usePatientDocuments';
import type { PatientDocument } from '../types';
import { DocumentRow, ROW_ACTION } from './DocumentRow';

/** Cuántos se ven antes de "Ver todos": que no empujen la historia muy abajo. */
const VISIBLES = 4;

/**
 * Mis documentos (ENG-164): lo que el paciente trajo de antes. Va en su
 * historia clínica pero en su propia tarjeta, con la aclaración de que no es
 * parte de lo firmado. El botón de subir está en la barra de la página.
 */
export function MyDocuments({ onUpload }: { onUpload: () => void }) {
  const documentos = useMyDocuments();
  const abrir = useOpenDocument();
  const retirar = useWithdrawDocument();
  const [aRetirar, setARetirar] = useState<PatientDocument | null>(null);
  const [todos, setTodos] = useState(false);

  const lista = documentos.data ?? [];
  const visibles = todos ? lista : lista.slice(0, VISIBLES);

  return (
    <section
      aria-labelledby="mis-documentos"
      className="overflow-hidden rounded-[14px] border border-line bg-white print:hidden"
    >
      <header className="flex items-start gap-3.5 border-b border-line-soft px-5 py-4">
        <span
          aria-hidden="true"
          className="grid size-9 flex-none place-items-center rounded-full bg-surface-teal text-brand-hover"
        >
          <svg
            viewBox="0 0 20 20"
            className="size-[18px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          >
            <path d="M5 2.5h6.5L15 6v11.5H5z" />
            <path d="M11.5 2.5V6H15M7.5 10h5M7.5 13h5" strokeLinecap="round" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="mis-documentos" className="text-[15px] font-bold text-brand-deep">
            Mis documentos
          </h2>
          <p className="text-[13px] leading-[1.6] text-muted">
            Estudios y papeles que traés de antes. Los ven los profesionales que te atienden, y
            aparecen como aportados por vos: no forman parte de la historia firmada.
          </p>
        </div>
      </header>

      {documentos.isPending ? (
        <p role="status" className="px-5 py-4 text-[13px] text-muted">
          Cargando tus documentos…
        </p>
      ) : documentos.isError ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <p className="text-[13px] text-danger">{documentos.error.message}</p>
          <button
            type="button"
            onClick={() => void documentos.refetch()}
            className="rounded-full border border-line-strong px-3.5 py-1.5 text-[13px] font-semibold text-brand-deep hover:border-brand hover:bg-surface-teal"
          >
            Probá de nuevo
          </button>
        </div>
      ) : lista.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-5">
          <p className="text-[13px] leading-[1.6] text-muted">
            Todavía no subiste nada. Si tenés análisis, informes o recetas de otro lugar, subilos
            para tenerlos acá.
          </p>
          <button
            type="button"
            onClick={onUpload}
            className="rounded-full border border-dashed border-line-strong px-4 py-2 text-[13px] font-semibold text-brand-deep transition-colors hover:border-brand hover:bg-surface-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            + Subir el primero
          </button>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-line-soft">
            {visibles.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => abrir.mutate(doc.id)}
                      aria-label={`Ver ${doc.title}`}
                      className={`${ROW_ACTION} text-brand-hover hover:bg-surface-teal`}
                    >
                      Ver
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        retirar.reset();
                        setARetirar(doc);
                      }}
                      aria-label={`Retirar ${doc.title}`}
                      className={`${ROW_ACTION} text-muted hover:bg-danger/10 hover:text-danger`}
                    >
                      Retirar
                    </button>
                  </>
                }
              />
            ))}
          </ul>
          {lista.length > VISIBLES && (
            <button
              type="button"
              onClick={() => setTodos((v) => !v)}
              className="w-full border-t border-line-soft px-5 py-3 text-left text-[13px] font-semibold text-brand-hover hover:bg-surface"
            >
              {todos ? 'Ver menos' : 'Ver todos'}
            </button>
          )}
        </>
      )}

      {abrir.isError && (
        <p role="alert" className="border-t border-line-soft px-5 py-3 text-[13px] text-danger">
          {abrir.error.message}
        </p>
      )}

      <ConfirmDialog
        open={aRetirar !== null}
        titulo="¿Retirar este documento?"
        confirmar="Retirar"
        destructivo
        pendiente={retirar.isPending}
        onCancel={() => setARetirar(null)}
        onConfirm={() =>
          aRetirar && retirar.mutate(aRetirar.id, { onSuccess: () => setARetirar(null) })
        }
      >
        Deja de verse para vos y para tus profesionales, pero queda registrado que lo subiste.
        {retirar.isError && (
          <p role="alert" className="mt-3 text-[13px] font-semibold text-danger">
            {retirar.error.message}
          </p>
        )}
      </ConfirmDialog>
    </section>
  );
}
