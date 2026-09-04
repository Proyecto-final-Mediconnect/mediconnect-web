import { ENTRY_TYPE_LABELS, type ClinicalEntryCard } from '../types/clinicalRecord';

/**
 * Una entrada de la historia clínica (ENG-59).
 *
 * El punto de color de la izquierda distingue el tipo, pero **no es lo único que
 * lo distingue**: el tipo va escrito arriba. Un historial médico leído por
 * alguien que no percibe color no puede depender de un punto.
 *
 * El vínculo de corrección se muestra en los DOS sentidos. El canvas dibuja solo
 * uno —la corrección dice a quién corrige—, y el que falta es el que importa:
 * quien está leyendo la entrada vieja tiene que enterarse de que hay una
 * posterior que la corrige, o va a tomar por vigente una indicación que ya no lo
 * está. La historia es append-only (ENG-100): el asiento original queda tal cual,
 * así que avisar es la única forma de que no engañe.
 */

type ClinicalEntryItemProps = {
  entry: ClinicalEntryCard;
  /** La entrada que corrige a esta, si alguna la corrigió. */
  corregidaPor?: ClinicalEntryCard;
  /** La entrada que esta corrige, si es una corrección. */
  corrige?: ClinicalEntryCard;
};

/** Color del punto por tipo. Acompaña al rótulo, no lo reemplaza. */
const PUNTO: Record<ClinicalEntryCard['tipo'], string> = {
  CONSULTA: 'bg-brand',
  DIAGNOSTICO: 'bg-brand-deep',
  PRESCRIPCION: 'bg-brand-hover',
  ESTUDIO: 'bg-muted-soft',
  CORRECCION: 'bg-danger',
};

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** `2026-06-13T21:02:00Z` → `13 de junio de 2026, 18:02`. */
function formatoLargo(iso: string): string {
  const f = new Date(iso);
  const hora = `${String(f.getHours()).padStart(2, '0')}:${String(f.getMinutes()).padStart(2, '0')}`;
  return `${f.getDate()} de ${MESES[f.getMonth()]} de ${f.getFullYear()}, ${hora}`;
}

export function ClinicalEntryItem({ entry, corregidaPor, corrige }: ClinicalEntryItemProps) {
  const esCorreccion = entry.correctsEntryId !== null;

  return (
    <article
      aria-labelledby={`entrada-${entry.id}`}
      className={`grid grid-cols-[14px_minmax(0,1fr)] gap-[18px] rounded-[14px] border bg-white p-6 ${
        corregidaPor ? 'border-danger/30' : 'border-line'
      }`}
    >
      <span
        aria-hidden="true"
        className={`mt-1.5 h-2.5 w-2.5 rounded-full ${PUNTO[entry.tipo]}`}
      />

      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-soft">
              {ENTRY_TYPE_LABELS[entry.tipo]} · {entry.codigo}
            </p>
            <h3
              id={`entrada-${entry.id}`}
              className="mt-1.5 text-[17px] font-bold text-brand-deep"
            >
              {entry.motivo}
            </h3>
            <p className="mt-1 text-[13px] text-muted">{entry.profesional}</p>
          </div>

          <p className="text-[13px] font-semibold text-muted tabular-nums">
            {formatoLargo(entry.fecha)}
          </p>
        </div>

        {/* El aviso va ARRIBA del contenido, no al pie: si aparece después de las
            indicaciones, ya se leyeron como vigentes. */}
        {corregidaPor && (
          <p className="mt-4 rounded-[10px] border border-danger/30 bg-danger/5 px-4 py-3 text-[13px] leading-[1.6] text-danger">
            <strong className="font-bold">Este registro fue corregido</strong> el{' '}
            {formatoLargo(corregidaPor.fecha)} por {corregidaPor.codigo}. Se conserva sin
            cambios, pero lo que vale es la corrección.
          </p>
        )}

        {esCorreccion && corrige && (
          <p className="mt-4 rounded-[10px] border border-line bg-surface px-4 py-3 text-[13px] leading-[1.6] text-muted">
            Corrige el registro <strong className="font-bold text-brand-deep">{corrige.codigo}</strong>,
            que permanece visible sin modificaciones.
          </p>
        )}

        {/* Los cuatro campos que ENG-58 guarda. Los que vengan vacíos no se
            dibujan: un rótulo con una raya no aporta nada y hace parecer que
            falta información que nunca se cargó. */}
        <dl className="mt-5 grid gap-5 sm:grid-cols-3">
          {entry.evolucion && <Campo titulo="Evolución">{entry.evolucion}</Campo>}
          {entry.diagnostico && <Campo titulo="Diagnóstico">{entry.diagnostico}</Campo>}
          {entry.plan && <Campo titulo="Plan">{entry.plan}</Campo>}
        </dl>

        {entry.adjunto && (
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line-soft pt-4">
            <span className="rounded-full bg-surface-teal px-3 py-1.5 text-[12px] font-semibold text-brand-hover">
              {entry.adjunto}
            </span>
            {/* Sin botón de abrir: no hay storage de adjuntos todavía, y ofrecer
                un estudio que no se puede abrir es peor que mostrar que existe. */}
            <span className="text-[12px] text-muted-soft">
              La descarga se habilita cuando exista el archivo.
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

function Campo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-soft">
        {titulo}
      </dt>
      <dd className="mt-[7px] text-sm font-medium leading-[1.55] text-ink">{children}</dd>
    </div>
  );
}
