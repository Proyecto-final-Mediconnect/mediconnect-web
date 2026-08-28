/**
 * Historia clínica (EP-06). Espeja lo que devuelve el backend.
 *
 * `content` es un recurso **FHIR R5** (`ClinicalImpression`) y no un objeto
 * propio: es lo que hace que la HC se pueda compartir fuera de MediConnect, que
 * es la premisa del MediPass. El front lo lee, nunca lo arma — el recurso lo
 * construye el backend porque entra a la preimagen del hash.
 */

/** Tipos que el profesional puede elegir en el formulario.
 *
 *  `CORRECCION` no está: una corrección necesita apuntar a la entrada que
 *  corrige y es ENG-100. */
export const SELECTABLE_ENTRY_TYPES = [
  'CONSULTA',
  'DIAGNOSTICO',
  'PRESCRIPCION',
  'ESTUDIO',
] as const;

export type SelectableEntryType = (typeof SELECTABLE_ENTRY_TYPES)[number];

export const ENTRY_TYPE_LABELS: Record<string, string> = {
  CONSULTA: 'Consulta',
  DIAGNOSTICO: 'Diagnóstico',
  PRESCRIPCION: 'Prescripción',
  ESTUDIO: 'Estudio',
  CORRECCION: 'Corrección',
};

export interface ClinicalEntry {
  id: string;
  patientId: string;
  professionalId: string;
  /** Posición en la cadena de hash del paciente. Arranca en 1. */
  sequenceNumber: number;
  entryType: string;
  fhirResourceType: string;
  content: unknown;
  consultationId: string | null;
  /** Entrada que esta corrige, si es una corrección (ENG-100). */
  correctsEntryId: string | null;
  /** ISO-8601. Lo fija el servidor al sellar: entra al hash. */
  createdAt: string;
  contentHash: string;
  previousHash: string;
}

/**
 * Lo que manda el formulario.
 *
 * No lleva `professionalId` ni `createdAt`: los dos entran a la preimagen del
 * hash y los pone el servidor. Mandarlos hace fallar el request entero — el
 * backend corre con `forbidNonWhitelisted`.
 */
export interface NewClinicalEntryPayload {
  entryType: SelectableEntryType;
  reason: string;
  findings?: string;
  diagnosis?: string;
  plan?: string;
  consultationId?: string;
}
