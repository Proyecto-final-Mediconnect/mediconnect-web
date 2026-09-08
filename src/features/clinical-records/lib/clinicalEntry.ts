import type { ClinicalEntry } from '../types/clinicalRecord';

/**
 * Lectura del contenido clínico guardado en `content` (ENG-58).
 *
 * El backend escribe un `ClinicalImpression` de FHIR R5 y `readEntry` lo lee.
 * Pero `content` es un JSONB y la tabla es **append-only**: lo que ya se escribió
 * con otra forma no se puede reescribir, ni siquiera para arreglarlo. Hoy
 * conviven en la misma base entradas `Encounter`, `Condition`,
 * `MedicationRequest` y `DiagnosticReport` con claves propias, y el día que
 * exista la importación del MediPass van a entrar recursos de otros emisores.
 *
 * Por eso hay dos niveles: `readEntry` entiende el recurso que escribe la app, y
 * `readEntryFields` cae a mostrar el contenido tal como está cuando no reconoce
 * ninguno de esos campos. Una historia clínica no puede quedar en blanco porque
 * el recurso no sea el que esperábamos: el dato está, y esconderlo es peor que
 * mostrarlo con una etiqueta imperfecta.
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

/** Un campo listo para dibujar: rótulo y contenido. */
export interface CampoLegible {
  label: string;
  value: string;
}

/**
 * Rótulos de las claves que hay escritas en la base fuera del
 * `ClinicalImpression` de la app.
 *
 * No es un mapeo FHIR: es traducir a algo legible lo que ya está guardado y no
 * se puede migrar. Lo que no figure acá se muestra igual, con la clave
 * humanizada — perder el rótulo es mejor que perder el dato.
 */
const ROTULOS: Record<string, string> = {
  motivo: 'Motivo',
  evolucion: 'Evolución',
  diagnostico: 'Diagnóstico',
  plan: 'Plan',
  descripcion: 'Descripción',
  codigo: 'Código',
  sistema: 'Sistema',
  estado: 'Estado',
  medicamento: 'Medicamento',
  dosis: 'Dosis',
  frecuencia: 'Frecuencia',
  duracion: 'Duración',
  estudio: 'Estudio',
  hallazgos: 'Hallazgos',
  conclusion: 'Conclusión',
  motivo_correccion: 'Motivo de la corrección',
  fecha_real: 'Fecha real',
};

/**
 * Orden de lectura de cada recurso.
 *
 * Postgres devuelve las claves del JSONB en su propio orden (por longitud, no
 * por sentido), así que una prescripción salía "Dosis, Duración, Frecuencia,
 * Medicamento" — el dato principal último. Esto la devuelve al orden en que un
 * profesional la lee. Lo que no esté listado va después, como venga.
 */
const ORDEN_POR_RECURSO: Record<string, string[]> = {
  Encounter: ['motivo', 'evolucion', 'diagnostico', 'plan'],
  Condition: ['descripcion', 'codigo', 'sistema', 'estado'],
  MedicationRequest: ['medicamento', 'dosis', 'frecuencia', 'duracion'],
  // Las correcciones se guardan como DiagnosticReport y abren con el motivo:
  // es lo que explica por qué existe la entrada.
  DiagnosticReport: ['motivo_correccion', 'fecha_real', 'estudio', 'hallazgos', 'conclusion'],
};

/** Andamiaje del recurso: identifica y referencia, no es contenido clínico. */
const NO_CLINICO = new Set(['resourceType', 'status', 'subject', 'performer', 'date', 'id', 'meta']);

/** `fecha_real` → `Fecha real`, para lo que no esté en `ROTULOS`. */
function humanizar(clave: string): string {
  const texto = clave.replace(/[_-]+/g, ' ').trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Los campos de la entrada, en orden de lectura.
 *
 * Primero intenta el recurso que escribe la app. Si no reconoce ninguno de esos
 * campos —porque el recurso es de otro tipo— muestra las claves del JSONB tal
 * como están. Es el camino que hoy necesitan las entradas `Encounter`,
 * `Condition`, `MedicationRequest` y `DiagnosticReport` que ya están en la base:
 * sin esto se dibujan como tarjetas sin una sola línea de contenido clínico.
 */
export function readEntryFields(entry: ClinicalEntry): CampoLegible[] {
  const fhir = readEntry(entry);
  const conocidos = (
    [
      { label: 'Motivo', value: fhir.reason },
      { label: 'Evolución', value: fhir.findings },
      { label: 'Diagnóstico', value: fhir.diagnosis },
      { label: 'Plan', value: fhir.plan },
    ] satisfies { label: string; value: string | null }[]
  ).filter((campo): campo is CampoLegible => campo.value !== null);

  if (conocidos.length > 0) return conocidos;

  const content = entry.content;
  if (typeof content !== 'object' || content === null) return [];

  const orden = ORDEN_POR_RECURSO[entry.fhirResourceType] ?? [];
  const posicion = (clave: string) => {
    const i = orden.indexOf(clave);
    return i === -1 ? orden.length : i;
  };

  return Object.entries(content as Record<string, unknown>)
    .filter(
      ([clave, valor]) =>
        !NO_CLINICO.has(clave) && typeof valor === 'string' && valor.length > 0,
    )
    .sort(([a], [b]) => posicion(a) - posicion(b))
    .map(([clave, valor]) => ({
      label: ROTULOS[clave] ?? humanizar(clave),
      value: valor as string,
    }));
}

/**
 * `2026-08-27T12:34:00.000Z` → `27 de agosto de 2026 · 09:34`, en hora local.
 *
 * Fecha larga y no `27/08/2026` porque es el titular de la tarjeta, y en el
 * resto de la app —tarjetas de turno, confirmación— la fecha que encabeza se
 * escribe así. La HC había quedado con el formato numérico de antes del
 * rediseño.
 *
 * La hora se conserva completa y en 24 hs: en un asiento clínico el momento es
 * parte del registro, no una decoración. Va con `hour12: false` para que no
 * salga `12:30 p. m.`, que ocupa más y se lee peor pegado a la fecha.
 */
const FECHA_LARGA = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const HORA = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function formatEntryDate(iso: string): string {
  const date = new Date(iso);

  return `${FECHA_LARGA.format(date)} · ${HORA.format(date)}`;
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
