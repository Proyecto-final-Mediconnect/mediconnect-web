import {
  TODOS,
  type ClinicalEntryCard,
  type ClinicalRecordFilters,
} from '../types/clinicalRecord';

/**
 * Reglas de la historia clínica (ENG-59): qué se muestra y cómo se relacionan
 * las entradas entre sí.
 *
 * Puras y aparte del componente, como `myAppointments` y `checkout`: se testean
 * sin montar React, y cuando exista el endpoint no cambia nada de esto.
 */

/**
 * Índice de correcciones: para cada entrada corregida, la que la corrige.
 *
 * La historia es append-only, así que una corrección **no modifica** el asiento
 * original: entra como una entrada nueva que lo apunta (ENG-100). El canvas
 * muestra ese vínculo en un solo sentido —la corrección dice a quién corrige—,
 * pero el sentido que importa es el otro: quien lee la entrada vieja tiene que
 * enterarse de que hay una posterior que la corrige. Sin eso, el registro
 * desactualizado se lee como vigente.
 */
export function correctionsByEntry(
  entries: ClinicalEntryCard[],
): Map<string, ClinicalEntryCard> {
  const indice = new Map<string, ClinicalEntryCard>();

  for (const entry of entries) {
    if (entry.correctsEntryId === null) continue;

    const previa = indice.get(entry.correctsEntryId);
    // Si una entrada se corrigió más de una vez, vale la última: es la vigente.
    if (!previa || previa.sequenceNumber < entry.sequenceNumber) {
      indice.set(entry.correctsEntryId, entry);
    }
  }

  return indice;
}

/** Las entradas de más nueva a más vieja, que es como se lee un historial. */
export function newestFirst(entries: ClinicalEntryCard[]): ClinicalEntryCard[] {
  return [...entries].sort((a, b) => b.sequenceNumber - a.sequenceNumber);
}

/** La fecha de la entrada, en `YYYY-MM-DD` local, para comparar con los filtros. */
function dayOf(entry: ClinicalEntryCard): string {
  const fecha = new Date(entry.fecha);
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/**
 * Aplica los filtros de la barra lateral.
 *
 * Todos se combinan con Y: elegir "estudios" y "con adjuntos" pide las dos
 * cosas. Los extremos del rango son inclusivos —el que filtra "hasta el 12/06"
 * espera ver lo del 12/06— y se comparan por día, no por instante: si no, una
 * entrada de las 18:02 quedaría afuera de su propio día.
 */
export function applyClinicalFilters(
  entries: ClinicalEntryCard[],
  filters: ClinicalRecordFilters,
): ClinicalEntryCard[] {
  return entries.filter((entry) => {
    if (filters.tipo !== TODOS && entry.tipo !== filters.tipo) return false;
    if (filters.professionalId !== TODOS && entry.professionalId !== filters.professionalId) {
      return false;
    }
    if (filters.soloConAdjuntos && entry.adjunto === null) return false;
    if (filters.soloCorrecciones && entry.correctsEntryId === null) return false;

    const dia = dayOf(entry);
    if (filters.desde !== null && dia < filters.desde) return false;
    if (filters.hasta !== null && dia > filters.hasta) return false;

    return true;
  });
}

/** Si hay algún filtro puesto. Sirve para ofrecer "limpiar" solo cuando aplica. */
export function hasClinicalFilters(filters: ClinicalRecordFilters): boolean {
  return (
    filters.tipo !== TODOS ||
    filters.professionalId !== TODOS ||
    filters.desde !== null ||
    filters.hasta !== null ||
    filters.soloConAdjuntos ||
    filters.soloCorrecciones
  );
}

/**
 * Los profesionales que firmaron algo, para el desplegable del filtro.
 *
 * Salen de las entradas y no de un endpoint aparte: el filtro solo tiene sentido
 * con quienes efectivamente escribieron en esta historia.
 */
export function professionalsIn(
  entries: ClinicalEntryCard[],
): { id: string; nombre: string }[] {
  const porId = new Map<string, string>();

  for (const entry of entries) {
    if (!porId.has(entry.professionalId)) {
      porId.set(entry.professionalId, entry.profesional);
    }
  }

  return [...porId].map(([id, nombre]) => ({ id, nombre }));
}
