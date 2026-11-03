import type { ReactNode } from 'react';
import { documentMeta, formatSize, isPdf } from '../lib/documents';
import type { PatientDocument } from '../types';

/** El ícono del archivo: una hoja con la esquina doblada, roja si es PDF. */
export function DocumentIcon({ mimeType }: { mimeType: string }) {
  const pdf = isPdf(mimeType);
  return (
    <span
      aria-hidden="true"
      className={`relative grid h-11 w-9 flex-none place-items-end rounded-[7px] pb-1.5 text-[9px] font-bold tracking-wide ${
        pdf ? 'bg-danger/10 text-danger' : 'bg-surface-teal text-brand-hover'
      }`}
    >
      <span className="absolute right-0 top-0 size-2.5 rounded-bl-[4px] bg-white/70" />
      {pdf ? 'PDF' : 'IMG'}
    </span>
  );
}

/** Un documento en una fila: qué es, de cuándo y de dónde, y sus acciones. */
export function DocumentRow({ doc, actions }: { doc: PatientDocument; actions: ReactNode }) {
  return (
    <li className="flex items-center gap-3.5 px-5 py-3.5">
      <DocumentIcon mimeType={doc.mimeType} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-brand-deep">
          {doc.title}
        </span>
        <span className="block truncate text-[12.5px] text-muted">
          {documentMeta(doc)}
          <span className="text-muted-soft"> · {formatSize(doc.sizeBytes)}</span>
        </span>
      </span>
      <span className="flex flex-none items-center gap-1">{actions}</span>
    </li>
  );
}

export const ROW_ACTION =
  'rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50';
