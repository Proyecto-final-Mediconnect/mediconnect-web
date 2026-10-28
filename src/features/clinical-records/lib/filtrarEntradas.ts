import { readEntryFields } from './clinicalEntry';
import { ENTRY_TYPE_LABELS, type ClinicalEntry } from '../types/clinicalRecord';

/**
 * Filtros de la historia clínica (pantalla "Historia clínica" del canvas).
 *
 * Van arriba de la cadena (`RecordToolbar`), y no son adorno:
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
  /** Texto libre: busca en el contenido, el tipo y el profesional. */
  busqueda: string;
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
  busqueda: '',
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
export function diaLocal(iso: string): string {
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

/** Minúsculas y sin tildes, para que "diagnostico" encuentre "Diagnóstico". */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Todo lo que se lee de una entrada, en un solo texto para buscar. */
function textoDe(entry: ClinicalEntry): string {
  return normalizar(
    [
      ENTRY_TYPE_LABELS[entry.entryType] ?? entry.entryType,
      nombreDe(entry),
      ...readEntryFields(entry).map((campo) => campo.value),
    ].join(' '),
  );
}

export function filtrarEntradas(entries: ClinicalEntry[], filtros: FiltrosHC): ClinicalEntry[] {
  const enCorreccion = idsEnCorreccion(entries);
  // Cada palabra tiene que aparecer, en cualquier orden: "ibuprofeno garcía".
  const palabras = normalizar(filtros.busqueda).split(/\s+/).filter(Boolean);

  return entries.filter((e) => {
    if (palabras.length) {
      const texto = textoDe(e);
      if (!palabras.every((p) => texto.includes(p))) return false;
    }
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

/** `true` si hay algún filtro puesto. */
export function hayFiltros(filtros: FiltrosHC): boolean {
  return (
    filtros.busqueda.trim() !== '' ||
    !!filtros.tipo ||
    !!filtros.profesional ||
    !!filtros.desde ||
    !!filtros.hasta ||
    filtros.soloCorrecciones
  );
}

/**
 * Las entradas agrupadas por mes (`YYYY-MM`, en la hora local), en el orden en
 * que llegan. La historia se lee por meses, como se recuerda: "en agosto me
 * vio la cardióloga".
 */
export function agruparPorMes(
  entries: ClinicalEntry[],
): { mes: string; entradas: ClinicalEntry[] }[] {
  const grupos: { mes: string; entradas: ClinicalEntry[] }[] = [];
  for (const e of entries) {
    const mes = diaLocal(e.createdAt).slice(0, 7);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.mes === mes) ultimo.entradas.push(e);
    else grupos.push({ mes, entradas: [e] });
  }
  return grupos;
}
