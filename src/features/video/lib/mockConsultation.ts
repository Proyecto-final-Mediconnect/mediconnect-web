/**
 * ⚠️ DATOS INVENTADOS — no salen de la API.
 *
 * El canvas dibuja, alrededor de la llamada, cuatro bloques de información
 * clínica que **hoy no tienen endpoint**:
 *
 * - Info de la paciente (alergias, medicación, condiciones, seguimiento)
 * - Consentimiento informado firmado
 * - Transcripción en vivo
 * - Resumen de la consulta generado con IA
 *
 * Los cuatro dependen de la historia clínica. `ClinicalRecordsService` existe en
 * el backend —append-only, cadena de hash, verificación— pero **no tiene
 * controller**: no hay ni una ruta HTTP. Y la transcripción y el resumen no
 * existen en ninguna forma.
 *
 * Se dibujan igual, con estos datos, para tener el recorrido completo armado. La
 * pantalla lo dice en cada bloque; migrar es borrar este archivo y seguir los
 * errores de compilación.
 *
 * LO QUE HARÍA FALTA DEL BACKEND
 *   GET  /patients/:id/clinical-record        → alergias, medicación, condiciones
 *   GET  /appointments/:id/consent            → consentimiento informado
 *   WS   /appointments/:id/transcription      → transcripción en vivo
 *   POST /appointments/:id/summary            → resumen con IA
 *   POST /appointments/:id/summary/sign       → firma e incorporación (usa ClinicalRecordsService.append)
 */

export interface MockPatientBrief {
  edad: number;
  alergias: string;
  medicacion: string;
  condiciones: string;
  seguimiento: string;
  /** Si firmó el consentimiento informado de la teleconsulta. */
  consentimientoFirmado: boolean;
}

/**
 * Ficha resumida de la contraparte.
 *
 * Es **una sola** y no un catálogo de casos variados a propósito: la
 * transcripción y el resumen de más abajo cuentan la misma consulta, y tres
 * fichas rotativas hacían que el panel dijera "hipotiroidismo" mientras la
 * transcripción hablaba de palpitaciones y apixabán. Datos clínicos de ejemplo
 * que se contradicen entre sí son peores que aburridos: parecen un bug.
 *
 * Sin parámetro: hoy no depende del turno. Cuando exista
 * `GET /patients/:id/clinical-record` esto se borra entero y los componentes
 * pasan a leer del hook, así que agregar un id ahora sería adivinar la firma.
 */
export function mockPatientBrief(): MockPatientBrief {
  return {
    edad: 41,
    alergias: 'Penicilina — anafilaxia',
    medicacion: 'Apixabán · Enalapril',
    condiciones: 'FA paroxística · HTA',
    seguimiento: '8 meses · 6 consultas',
    consentimientoFirmado: true,
  };
}

/** Una línea de la transcripción. `quien` es de quién es la voz. */
export interface MockTranscriptLine {
  id: number;
  quien: 'PROFESIONAL' | 'PACIENTE';
  texto: string;
}

/**
 * Transcripción de ejemplo.
 *
 * Es deliberadamente banal —motivo de consulta, síntomas, indicación— para que
 * nadie la confunda con un caso clínico real si esta pantalla queda abierta en
 * una demo.
 */
export const MOCK_TRANSCRIPT: MockTranscriptLine[] = [
  { id: 1, quien: 'PROFESIONAL', texto: '¿Cómo venís con las palpitaciones desde la última vez?' },
  { id: 2, quien: 'PACIENTE', texto: 'Mucho mejor. Tuve dos episodios cortos, los dos de noche.' },
  { id: 3, quien: 'PROFESIONAL', texto: '¿Y cuánto te duraron?' },
  { id: 4, quien: 'PACIENTE', texto: 'Un par de minutos. Se pasaron solos, sin mareo ni nada.' },
  { id: 5, quien: 'PROFESIONAL', texto: 'Bien. ¿Estás tomando el apixabán todos los días?' },
  { id: 6, quien: 'PACIENTE', texto: 'Sí, a la mañana y a la noche, sin saltearme ninguno.' },
];

/** Cuántas intervenciones dice tener la transcripción completa. */
export const MOCK_TRANSCRIPT_LINES = 148;

/**
 * Resumen que devolvería el modelo, ya redactado.
 *
 * Va en secciones y no en un párrafo porque el profesional lo va a **editar y
 * firmar**: texto corrido obliga a releer todo para cambiar una indicación.
 */
export const MOCK_SUMMARY = `Motivo de consulta
Control de fibrilación auricular paroxística.

Evolución
Refiere dos episodios de palpitaciones en el último mes, ambos nocturnos, de
pocos minutos de duración y con resolución espontánea. Sin mareos, disnea ni
dolor precordial asociados.

Tratamiento actual
Apixabán 5 mg cada 12 horas, con buena adherencia referida. Enalapril 10 mg/día.

Indicaciones
Continuar el esquema actual. Registrar fecha, hora y duración de cada episodio.
Consultar por guardia ante un episodio de más de 30 minutos o con mareo.

Próximo control
En tres meses, con Holter de 24 horas previo.`;
