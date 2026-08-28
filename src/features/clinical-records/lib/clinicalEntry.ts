import type { ClinicalEntry } from '../types/clinicalRecord';

/**
 * Lectura del recurso FHIR guardado en `content` (ENG-58).
 *
 * El backend guarda un `ClinicalImpression` de FHIR R5. La UI no puede asumir
 * que ese objeto tiene la forma que espera: es un JSONB que puede haber sido
 * escrito por una versión anterior del mapeo, o —cuando exista la importación
 * desde otro sistema— por otro emisor. Por eso cada campo se lee con guardas y
 * devuelve `null` en vez de romper la pantalla.
 *
 * Lógica pura, sin React, para poder testear los casos raros sin montar nada.
 */

export interface ReadableEntry {
  /** Motivo de consulta. */
  reason: string | null;
  /** Evolución y hallazgos. */
  findings: string | null;
  diagnosis: string | null;
  plan: string | null;
}

/** Lee una propiedad string de un objeto desconocido. */
function stringAt(source: unknown, key: string): string | null {
  if (typeof source !== 'object' || source === null) return null;

  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function readEntry(entry: ClinicalEntry): ReadableEntry {
  const content = entry.content;

  const findingItem = (() => {
    if (typeof content !== 'object' || content === null) return null;
    const finding = (content as Record<string, unknown>).finding;
    if (!Array.isArray(finding) || finding.length === 0) return null;
    const item = (finding[0] as Record<string, unknown>)?.item;
    const concept = (item as Record<string, unknown>)?.concept;
    return stringAt(concept, 'text');
  })();

  const noteText = (() => {
    if (typeof content !== 'object' || content === null) return null;
    const note = (content as Record<string, unknown>).note;
    if (!Array.isArray(note) || note.length === 0) return null;
    return stringAt(note[0], 'text');
  })();

  return {
    reason: stringAt(content, 'description'),
    findings: stringAt(content, 'summary'),
    diagnosis: findingItem,
    plan: noteText,
  };
}

/** `2026-08-27T12:34:00.000Z` → `27/08/2026 09:34`, en hora local. */
export function formatEntryDate(iso: string): string {
  const date = new Date(iso);

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Los primeros 8 caracteres del hash, para mostrarlo sin ocupar media pantalla.
 *
 * Se muestra a propósito: es la evidencia visible de que la entrada está sellada
 * y es lo que le da sentido al "inmutable" del criterio de aceptación. Nadie va a
 * comparar el hash a ojo, pero verlo comunica que existe.
 */
export function shortHash(hash: string): string {
  return hash.slice(0, 8);
}
