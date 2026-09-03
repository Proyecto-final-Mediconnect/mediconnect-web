import type { ProfessionalCard } from '../types/catalog';

/**
 * ⚠️ DATOS INVENTADOS — no salen de la API.
 *
 * `GET /catalog/professionals` (ENG-49) devuelve nombre, foto, especialidades,
 * precio y moneda. El diseño del catálogo muestra además matrícula, años de
 * experiencia, bio, calificación, cantidad de reseñas, modalidad y próximo
 * turno. Nada de eso existe todavía, así que se genera acá para que la pantalla
 * se vea como tiene que verse.
 *
 * **Todo este archivo se borra cuando lleguen los campos reales.** Es a
 * propósito que estén todos juntos en un solo lugar y no repartidos por los
 * componentes: así se ve de un vistazo qué es mentira, y migrar es borrar el
 * archivo y seguir los errores de compilación.
 *
 * Lo que hace falta del lado del backend, por si alguien retoma esto:
 *
 * - `bio` ya existe en `GET /professionals/:id`; falta sumarla al `select` del
 *   listado, o decidir que no va en la tarjeta.
 * - `licenseNumber` está **deliberadamente fuera** del `select` del catálogo.
 *   Exponerla es una decisión de producto y de privacidad, no un olvido: hay que
 *   discutirla antes de mostrarla.
 * - Calificación y reseñas son ENG-80 / ENG-82, en Backlog.
 * - "Próximo turno" necesitaría resolver disponibilidad por profesional en el
 *   listado, que hoy es una consulta por cada uno.
 *
 * Los valores son **determinísticos** a partir del id: el mismo profesional
 * muestra siempre lo mismo, entre renders y entre recargas. Con `Math.random`
 * los números bailarían en cada scroll y el filtro por calificación daría
 * resultados distintos cada vez.
 */

export type MockProfessionalDetails = {
  licenseNumber: string;
  yearsOfExperience: number;
  bio: string;
  rating: number;
  reviewCount: number;
  modality: string;
  /** Días desde hoy hasta el próximo turno libre. 0 = hoy. */
  nextSlotInDays: number;
};

/** Hash entero barato y estable sobre el id. */
function hash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const MODALIDADES = [
  'Videoconsulta',
  'Videoconsulta y presencial',
  'Videoconsulta · atiende obras sociales',
];

const BIOS = [
  'Atiendo consultas de seguimiento y controles, con foco en que te lleves un plan claro y por escrito.',
  'Trabajo con historia clínica compartida: si ya te atendiste antes, no hace falta que repitas todo de cero.',
  'Consultas de diagnóstico y control. Respondo dudas entre turno y turno por el chat de la plataforma.',
  'Más de una década en consultorio y ahora también online, con la misma agenda y los mismos estudios a la vista.',
];

export function mockDetailsFor(professional: ProfessionalCard): MockProfessionalDetails {
  const h = hash(professional.id);

  return {
    licenseNumber: String(30000 + (h % 70000)),
    yearsOfExperience: 4 + (h % 22),
    bio: BIOS[h % BIOS.length],
    // 3.6 – 5.0, con un decimal.
    rating: Math.round((36 + (h % 15)) * 10) / 100,
    reviewCount: 8 + (h % 190),
    modality: MODALIDADES[h % MODALIDADES.length],
    nextSlotInDays: h % 9,
  };
}

/** "hoy", "mañana", "en 4 días" — para el bloque "Próximo turno". */
export function describeNextSlot(days: number): string {
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  return `En ${days} días`;
}
