import type { DocumentType, PatientDocument } from '../types';

/** El tope del backend y del bucket. */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_MIME = ['application/pdf', 'image/jpeg', 'image/png'] as const;

export const TYPE_LABELS: Record<DocumentType, string> = {
  ESTUDIO: 'Estudio',
  EPICRISIS: 'Epicrisis',
  INFORME: 'Informe',
  RECETA: 'Receta',
  OTRO: 'Otro',
};

/**
 * Lo que se puede chequear antes de subir, con el mismo mensaje que el backend.
 * El backend igual mira la firma del archivo: esto solo evita esperar una
 * subida de 30 MB para enterarse de que no entraba.
 */
export function fileProblem(file: File): string | null {
  if (!(ACCEPTED_MIME as readonly string[]).includes(file.type)) {
    return 'Solo se pueden subir PDF, JPG o PNG.';
  }
  if (file.size === 0) return 'El archivo está vacío.';
  if (file.size > MAX_DOCUMENT_BYTES) return 'El archivo no puede pasar los 10 MB.';
  return null;
}

/** El nombre del archivo sin extensión, como sugerencia de título. */
export function suggestedTitle(file: File): string {
  return file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .slice(0, 120);
}

export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

const FECHA = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** `Estudio · 10 sept 2026 · Hospital Privado`, salteando lo que falta. */
export function documentMeta(doc: PatientDocument): string {
  return [
    TYPE_LABELS[doc.type],
    doc.documentDate ? FECHA.format(new Date(`${doc.documentDate}T00:00:00Z`)) : null,
    doc.sourceInstitution,
  ]
    .filter(Boolean)
    .join(' · ');
}

export const isPdf = (mimeType: string) => mimeType === 'application/pdf';
