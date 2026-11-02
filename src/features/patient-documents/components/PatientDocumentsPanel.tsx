import { useOpenDocument, usePatientDocuments } from '../hooks/usePatientDocuments';
import { DocumentRow, ROW_ACTION } from './DocumentRow';

/**
 * Lo que aportó el paciente, visto por el profesional (ENG-164). Va en su
 * propia franja y con la marca "no validado", bien distinto de las entradas
 * firmadas: es lo que el paciente dice que trae, no un asiento clínico.
 *
 * Sin documentos no ocupa lugar. Un error tampoco tapa la historia: se dice en
 * una línea y la HC sigue abajo.
 */
export function PatientDocumentsPanel({ patientId }: { patientId: string }) {
  const documentos = usePatientDocuments(patientId);
  const abrir = useOpenDocument();

  if (documentos.isPending || (documentos.data && documentos.data.length === 0)) return null;

  return (
    <section
      aria-labelledby="aportados"
      className="overflow-hidden rounded-[14px] border border-dashed border-tag-warm-dot/60 bg-tag-warm/40 print:hidden"
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3.5">
        <h2 id="aportados" className="text-[14px] font-bold text-brand-deep">
          Documentación aportada por el paciente
        </h2>
        <span className="rounded-full bg-tag-warm px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-tag-warm-ink">
          No validado
        </span>
      </header>

      {documentos.isError ? (
        <p
          role="alert"
          className="border-t border-tag-warm-dot/30 px-5 py-3 text-[13px] text-danger"
        >
          {documentos.error.message}
        </p>
      ) : (
        <ul className="divide-y divide-line-soft border-t border-tag-warm-dot/30 bg-white">
          {documentos.data.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              actions={
                <button
                  type="button"
                  onClick={() => abrir.mutate(doc.id)}
                  aria-label={`Ver ${doc.title}`}
                  className={`${ROW_ACTION} text-brand-hover hover:bg-surface-teal`}
                >
                  Ver
                </button>
              }
            />
          ))}
        </ul>
      )}
      {abrir.isError && (
        <p
          role="alert"
          className="border-t border-line-soft bg-white px-5 py-3 text-[13px] text-danger"
        >
          {abrir.error.message}
        </p>
      )}
    </section>
  );
}
