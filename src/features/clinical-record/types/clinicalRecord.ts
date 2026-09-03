/**
 * Tipos de la historia clínica (EP-06, ENG-59).
 *
 * **Todavía no hay endpoint.** `ClinicalRecordsService` está construido y
 * testeado en el backend —append-only, cadena de hash, verificación— pero el
 * módulo no expone ningún controller, así que no existe una ruta HTTP.
 *
 * `ClinicalEntry` espeja `ClinicalEntryView`, que es lo que ese service ya
 * devuelve: cuando se exponga, esto no debería cambiar.
 */

/** Espeja el enum `entry_type` de la base. */
export type ClinicalEntryType =
  | 'CONSULTA'
  | 'DIAGNOSTICO'
  | 'PRESCRIPCION'
  | 'ESTUDIO'
  | 'CORRECCION';

/**
 * Una entrada tal como la devuelve el backend.
 *
 * Los datos clínicos viajan en `content` como un recurso **FHIR R5** (ADR-014):
 * un `Condition`, un `MedicationRequest`, un `DiagnosticReport`. Esta pantalla
 * no los sabe leer todavía —hace falta un mapeo FHIR → tarjeta que se escribe
 * cuando exista el endpoint y se sepa qué recursos manda cada flujo—, así que
 * hoy `ClinicalEntryCard` se construye directamente en el mock.
 */
export interface ClinicalEntry {
  id: string;
  patientId: string;
  professionalId: string;
  sequenceNumber: number;
  entryType: ClinicalEntryType;
  fhirResourceType: string;
  content: unknown;
  consultationId: string | null;
  /** Entrada que esta corrige. La corregida NO se toca (ENG-100). */
  correctsEntryId: string | null;
  createdAt: string;
  contentHash: string;
  previousHash: string;
}

/**
 * Una entrada lista para dibujar.
 *
 * Es el resultado de leer el `content` FHIR y sacar lo que la pantalla muestra.
 * Se mantiene aparte de `ClinicalEntry` a propósito: el día que exista el mapeo,
 * lo único que hay que escribir es la función que convierte uno en otro, y ni los
 * componentes ni los filtros se enteran.
 *
 * **Los cuatro campos clínicos son los que ENG-58 guarda de verdad**: motivo
 * (obligatorio), evolución, diagnóstico y plan. El canvas muestra en cambio
 * "diagnóstico · indicaciones · medicación", y medicación no existe como campo:
 * la medicación va dentro del plan. Se sigue el DTO y no el canvas, porque una
 * tarjeta con un campo que nadie escribe queda vacía siempre.
 */
export interface ClinicalEntryCard {
  id: string;
  /** Código legible del asiento, el que se cita en una corrección. */
  codigo: string;
  tipo: ClinicalEntryType;
  /** Instante ISO-8601. */
  fecha: string;
  /** Motivo de consulta. El único obligatorio del DTO. */
  motivo: string;
  professionalId: string;
  /** Quién firma, ya formateado: nombre · especialidad · matrícula. */
  profesional: string;
  /** Evolución y hallazgos. */
  evolucion: string;
  diagnostico: string;
  /** Plan o indicaciones, incluida la medicación. */
  plan: string;
  /** Nombre del archivo adjunto, o `null` si no tiene. */
  adjunto: string | null;
  correctsEntryId: string | null;
  sequenceNumber: number;
}

/** Filtros de la barra lateral. */
export interface ClinicalRecordFilters {
  tipo: ClinicalEntryType | 'TODOS';
  professionalId: string;
  /** `YYYY-MM-DD`, o `null` si el extremo está abierto. */
  desde: string | null;
  hasta: string | null;
  soloConAdjuntos: boolean;
  soloCorrecciones: boolean;
}

export const TODOS = 'TODOS';

export const EMPTY_CLINICAL_FILTERS: ClinicalRecordFilters = {
  tipo: TODOS,
  professionalId: TODOS,
  desde: null,
  hasta: null,
  soloConAdjuntos: false,
  soloCorrecciones: false,
};

/** Nombre visible de cada tipo de entrada. */
export const ENTRY_TYPE_LABELS: Record<ClinicalEntryType, string> = {
  CONSULTA: 'Consulta',
  DIAGNOSTICO: 'Diagnóstico',
  PRESCRIPCION: 'Prescripción',
  ESTUDIO: 'Estudio',
  CORRECCION: 'Corrección',
};
