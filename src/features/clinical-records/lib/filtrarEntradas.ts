import type { ClinicalEntry } from '../types/clinicalRecord';

/**
 * Filtros de la historia clínica (pantalla "Historia clínica" del canvas).
 *
 * El canvas pone un panel de filtros al costado de la cadena, y no es adorno:
 * una historia real tiene decenas de entradas de varios profesionales, y quien
 * la abre casi siempre busca algo puntual —"qué me dijo el cardiólogo", "las
 * prescripciones del año pasado"—. Sin filtros, la única herramienta es
 * scrollear.
 *
 * Se filtra en el cliente y no en el backend a propósito: la HC completa ya
 * viene en una sola respuesta (`GET /patients/:id/clinical-record`), así que
 * pedirla de nuevo por cada cambio de filtro sería una vuelta al servidor —y una
 * fila más en `audit_logs`, que registra cada lectura de la historia (Ley
 * 26.529). Filtrar acá no genera accesos que no ocurrieron.
 *
 * Lógica pura, sin React: los casos borde de fechas se prueban sin montar nada.
 */

export interface FiltrosHC {
  /** `''` = todos. */
  tipo: string;
  /** Nombre completo del profesional. `''` = todos. */
  profesional: string;
  /** `YYYY-MM-DD`, inclusive. `''` = sin límite. */
  desde: string;
  hasta: string;
  /** Solo entradas que corrigen a otra, o que fueron corregidas. */
  soloCorrecciones: boolean;
}

export const FILTROS_VACIOS: FiltrosHC = {
  tipo: '',
  profesional: '',
  desde: '',
  hasta: '',
  soloCorrecciones: false,
};

export function nombreDe(entry: ClinicalEntry): string {
  return entry.professional
    ? `${entry.professional.firstName} ${entry.professional.lastName}`
    : 'Sin profesional';
}

/** `2026-08-27T12:34:00.000Z` → `2026-08-27`, en hora local.
 *
 *  Local y no UTC: el input de fecha que elige la persona es local, y comparar
 *  contra la fecha UTC dejaba afuera las entradas de la noche —una consulta de
 *  las 22:00 en Argentina es del día siguiente en UTC. */
function diaLocal(iso: string): string {
  const d = new Date(iso);
  const mes = `${d.getMonth() + 1}`.padStart(2, '0');
  const dia = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Las entradas que hay que resaltar como parte de una corrección: la que
 *  corrige y la corregida. Se calcula sobre la lista completa, no sobre la
 *  filtrada — si no, filtrar por tipo escondería el otro lado del vínculo. */
export function idsEnCorreccion(entries: ClinicalEntry[]): Set<string> {
  const ids = new Set<string>();
  for (const e of entries) {
    if (e.correctsEntryId) {
      ids.add(e.id);
      ids.add(e.correctsEntryId);
    }
  }
  return ids;
}

export function filtrarEntradas(entries: ClinicalEntry[], filtros: FiltrosHC): ClinicalEntry[] {
  const enCorreccion = idsEnCorreccion(entries);

  return entries.filter((e) => {
    if (filtros.tipo && e.entryType !== filtros.tipo) return false;
    if (filtros.profesional && nombreDe(e) !== filtros.profesional) return false;
    if (filtros.soloCorrecciones && !enCorreccion.has(e.id)) return false;

    const dia = diaLocal(e.createdAt);
    if (filtros.desde && dia < filtros.desde) return false;
    if (filtros.hasta && dia > filtros.hasta) return false;

    return true;
  });
}

/** Las opciones que tiene sentido ofrecer: solo lo que existe en esta historia.
 *  Un desplegable con los cinco tipos posibles cuando la cadena tiene dos
 *  ofrece tres filtros que siempre devuelven vacío. */
export function opcionesDe(entries: ClinicalEntry[]): {
  tipos: string[];
  profesionales: string[];
} {
  return {
    tipos: [...new Set(entries.map((e) => e.entryType))].sort(),
    profesionales: [...new Set(entries.map(nombreDe))].sort(),
  };
}
