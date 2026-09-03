import type { ClinicalEntryCard } from '../types/clinicalRecord';

/**
 * ⚠️ DATOS INVENTADOS — no salen de la API.
 *
 * **En `main` no hay endpoint de historia clínica todavía.**
 * `ClinicalRecordsService` está construido y testeado —append-only, cadena de
 * hash, verificación de integridad— pero el controller que lo expone vive en un
 * PR sin mergear.
 *
 * LO QUE HARÍA FALTA DEL BACKEND
 *   GET /patients/:patientId/clinical-record   → las entradas (¡ya existe! ver abajo)
 *   GET /patients/me/clinical-record/integrity → estado de la cadena de hash
 *   GET /patients/me/clinical-record.pdf       → la descarga
 *   GET /patients/:id/vitals                   → la serie de signos vitales del gráfico
 *   GET /patients/:id/access-grant             → hasta cuándo y con qué alcance
 *
 * **El primero está en camino.** El PR #46 del backend (ENG-60, de Juan, en
 * revisión) agrega `ClinicalRecordsController` con
 * `@Controller('patients/:patientId/clinical-record')`, valida la relación por
 * RLS y audita cada lectura en `audit_logs`. Cuando mergee, esta pantalla
 * consume eso y este archivo se reduce a lo que siga sin fuente.
 *
 * Las tres primeras ya tienen su método en el service (`listForPatient`,
 * `verifyPatientChain`): falta exponerlas.
 *
 * Además falta un paso que hoy no existe en ningún lado: el `content` de cada
 * entrada es un recurso **FHIR R5** (ADR-014), y alguien tiene que escribir el
 * mapeo de ese recurso a las líneas que muestra la tarjeta. Por eso acá se
 * fabrica directamente el `ClinicalEntryCard` y no un `ClinicalEntry`: inventar
 * el FHIR sería inventar dos capas en vez de una.
 */

const PRO = 'pro-ocampo';
const LAB = 'lab-central';

const OCAMPO = 'Dra. Valeria Ocampo · Cardiología · MN 128.446';

/**
 * Historia de ejemplo.
 *
 * Cuenta un caso coherente de punta a punta —alta, estudio, corrección de dosis,
 * control— porque el punto de la pantalla es justamente que se lea como una
 * historia. Incluye una corrección de verdad (`correctsEntryId`) para poder ver
 * el vínculo en los dos sentidos, que es lo que ENG-100 hace posible.
 */
export const MOCK_CLINICAL_ENTRIES: ClinicalEntryCard[] = [
  {
    id: 'e-0512',
    codigo: 'REG-2026-0512',
    tipo: 'CONSULTA',
    fecha: '2026-03-02T13:05:00.000Z',
    motivo: 'Primera consulta · alta de seguimiento',
    professionalId: PRO,
    profesional: OCAMPO,
    evolucion: 'Paciente asintomática al momento de la consulta. Sin episodios previos documentados.',
    diagnostico: 'Fibrilación auricular paroxística (I48)',
    plan: 'Inicio de anticoagulación con apixabán 5 mg c/12 h. Control en 60 días con Holter.',
    adjunto: null,
    correctsEntryId: null,
    sequenceNumber: 1,
  },
  {
    id: 'e-0704',
    codigo: 'REG-2026-0704',
    tipo: 'ESTUDIO',
    fecha: '2026-06-12T14:20:00.000Z',
    motivo: 'Perfil lipídico y glucemia',
    professionalId: LAB,
    profesional: 'Laboratorio Central Córdoba',
    evolucion: 'Colesterol total 244 mg/dl · LDL 161 mg/dl · glucemia 98 mg/dl.',
    diagnostico: '',
    plan: 'Enviado a la profesional para su revisión.',
    adjunto: 'Resultados de laboratorio · PDF',
    correctsEntryId: null,
    sequenceNumber: 2,
  },
  {
    id: 'e-0709',
    codigo: 'REG-2026-0709',
    tipo: 'CORRECCION',
    fecha: '2026-06-13T21:02:00.000Z',
    motivo: 'Corrección de dosis del registro REG-2026-0704',
    professionalId: PRO,
    profesional: OCAMPO,
    evolucion: 'Se revisa el laboratorio del 12/06.',
    diagnostico: 'Dislipidemia mixta (E78.2)',
    plan: 'Se corrige la dosis indicada el 12/06: atorvastatina 20 mg por la noche.',
    adjunto: null,
    correctsEntryId: 'e-0704',
    sequenceNumber: 3,
  },
  {
    id: 'e-0811',
    codigo: 'REG-2026-0811',
    tipo: 'CONSULTA',
    fecha: '2026-08-20T12:30:00.000Z',
    motivo: 'Control de hipertensión',
    professionalId: PRO,
    profesional: OCAMPO,
    evolucion: 'Buena tolerancia al tratamiento. Refiere adherencia completa.',
    diagnostico: 'Hipertensión arterial esencial (I10), controlada',
    plan: 'Continuar dieta hiposódica y enalapril 10 mg c/12 h. Registro domiciliario de presión dos veces por día.',
    adjunto: 'Registro de presión domiciliaria · PDF',
    correctsEntryId: null,
    sequenceNumber: 4,
  },
];

/**
 * Estado de la cadena de hash.
 *
 * El backend sabe calcularlo de verdad (`verifyPatientChain`, ADR-015): recorre
 * las entradas, recalcula cada hash y compara con el anterior. Acá está fijo en
 * "íntegra" porque no hay a quién preguntarle.
 */
export const MOCK_CHAIN_STATUS = {
  integra: true,
  entradas: MOCK_CLINICAL_ENTRIES.length,
  verificadaEl: '2026-09-03T09:00:00.000Z',
};

/** Una toma de presión. */
export interface VitalReading {
  /** `YYYY-MM-DD` */
  fecha: string;
  sistolica: number;
  diastolica: number;
}

/**
 * Últimos controles de presión.
 *
 * La serie sube de a poco a propósito: es lo que hace que la alerta de abajo
 * tenga sentido cuando se la lee al lado del gráfico. Datos clínicos de ejemplo
 * que no se corresponden con lo que dice el texto de al lado parecen un bug.
 */
export const MOCK_VITALS: VitalReading[] = [
  { fecha: '2026-03-02', sistolica: 128, diastolica: 82 },
  { fecha: '2026-04-06', sistolica: 131, diastolica: 84 },
  { fecha: '2026-05-11', sistolica: 133, diastolica: 85 },
  { fecha: '2026-06-12', sistolica: 132, diastolica: 83 },
  { fecha: '2026-07-06', sistolica: 138, diastolica: 88 },
  { fecha: '2026-07-28', sistolica: 141, diastolica: 89 },
  { fecha: '2026-08-14', sistolica: 145, diastolica: 90 },
  { fecha: '2026-08-20', sistolica: 148, diastolica: 92 },
];

/** Umbral clínico de la serie de arriba, en mmHg. */
export const OBJETIVO_SISTOLICA = 130;

/**
 * Permiso con el que el profesional está viendo esta ficha.
 *
 * Es el modelo de MediPass: el paciente otorga acceso, con vencimiento y
 * alcance. No existe todavía en el backend.
 */
export const MOCK_ACCESS_GRANT = {
  vence: '2026-09-30',
  alcance: 'completo' as const,
};
