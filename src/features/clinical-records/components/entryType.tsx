import { ENTRY_TYPE_LABELS } from '../types/clinicalRecord';
import { TONO_TIPO } from '../lib/entryTone';

const TONO_POR_DEFECTO = { chip: 'bg-line-soft text-muted', dot: 'bg-muted-soft' };

export function TypeChip({ type }: { type: string }) {
  const tono = TONO_TIPO[type] ?? TONO_POR_DEFECTO;
  return (
    <span
      className={`inline-flex flex-none items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${tono.chip}`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${tono.dot}`} />
      {ENTRY_TYPE_LABELS[type] ?? type}
    </span>
  );
}

/** "Corregida": hay un registro posterior que la corrige. */
export function CorrectedChip() {
  return (
    <span className="inline-flex flex-none items-center gap-1.5 rounded-full bg-tag-warm px-2.5 py-1 text-xs font-semibold text-tag-warm-ink">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-tag-warm-dot" />
      Corregida
    </span>
  );
}
