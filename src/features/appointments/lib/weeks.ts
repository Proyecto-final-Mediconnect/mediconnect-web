import { addDays, todayLocal, weekdayOf } from '../../schedule/lib/generateSlots';

/**
 * Ventana de fechas de la pantalla de reserva (ENG-54).
 *
 * Reusa los helpers de fecha de ENG-53 en vez de reescribirlos: son funciones
 * puras y ya testeadas, y dos implementaciones de "sumar un día" es exactamente
 * el tipo de duplicación que después se desincroniza.
 * TODO: cuando ENG-53 y ENG-54 estén mergeados, mover `addDays` / `mondayOf` /
 * `todayLocal` a `shared/lib/dates` — hoy son de la feature `schedule` y esto es
 * un import cruzado entre features.
 *
 * ---------------------------------------------------------------------------
 * Por qué esto dejó de ir de lunes a domingo
 * ---------------------------------------------------------------------------
 * Antes cada página era una semana calendario y la primera arrancaba el LUNES de
 * la semana en curso. Tenía dos problemas, y los dos se veían:
 *
 * - **Mostraba días pasados.** Un sábado, cinco de las siete tarjetas eran días
 *   que ya habían ocurrido, con todos sus horarios en gris.
 * - **Se veía menos futuro del que hay.** El backend publica 28 días desde hoy,
 *   pero las cuatro semanas se comían los días ya transcurridos: un domingo, la
 *   última página terminaba a 21 días vista en vez de 28.
 *
 * Ahora la ventana es **móvil y arranca hoy**: páginas de siete días que cubren
 * exactamente el horizonte del backend, sin desperdiciar ninguno.
 */

/**
 * Días que publica el backend, contando hoy. Espeja `BOOKING_HORIZON_DAYS` de
 * `appointments.service.ts`; si cambia una, tiene que cambiar la otra.
 */
export const BOOKING_HORIZON_DAYS = 60;

/** Cuántos días muestra una página del calendario. */
export const PAGE_DAYS = 7;

/** Con 60 días la última página queda corta (60 = 8×7 + 4). Se redondea para
 *  arriba: esos cuatro días también son reservables y tienen que ser
 *  alcanzables. `daysOfPage` devuelve lo que haya, sin rellenar. */
export const BOOKING_PAGES = Math.ceil(BOOKING_HORIZON_DAYS / PAGE_DAYS);

export const MAX_PAGE = BOOKING_PAGES - 1;

export interface DateRange {
  /** `YYYY-MM-DD`. */
  from: string;
  /** `YYYY-MM-DD`. */
  to: string;
}

/**
 * El horizonte completo, en UN solo rango.
 *
 * Se pide todo junto y se pagina del lado del cliente. Antes cada click en la
 * flecha disparaba una consulta nueva, y eso traía dos cosas: una espera por
 * página, y —lo importante— era imposible saber en qué página está el primer día
 * con lugar sin haberla pedido antes. Con los 60 días en memoria, saltar al
 * primer día disponible es mirar un array.
 *
 * Entra en una sola consulta: el backend publica 60 días (`BOOKING_HORIZON_DAYS`)
 * y acepta hasta 62 por consulta (`MAX_RANGE_DAYS`, definido como el horizonte
 * más dos justamente para que esto entre), así que `to` cae en el último día
 * publicado. El test `'el horizonte son dos meses…'` fija los números de este
 * lado para que la desincronización se note acá y no con un 400 en producción.
 */
export function horizonRange(today = todayLocal()): DateRange {
  return { from: today, to: addDays(today, BOOKING_HORIZON_DAYS - 1) };
}

/** Recorta la página `page` de la lista completa de días. */
export function daysOfPage<T>(days: T[], page: number): T[] {
  return days.slice(page * PAGE_DAYS, (page + 1) * PAGE_DAYS);
}

/** Página que contiene al día número `index` de la ventana. */
export function pageOfIndex(index: number): number {
  return Math.floor(index / PAGE_DAYS);
}

/**
 * Índice del primer día con al menos un horario reservable, o `-1` si no hay
 * ninguno en todo el horizonte.
 *
 * Mira `AVAILABLE` y no "que tenga horarios": un día lleno de turnos ocupados
 * tiene horarios y no sirve para reservar. Abrir uno así era el otro síntoma
 * reportado —"me muestra días sin turnos disponibles"—, y pasaba tanto con los
 * días pasados como con los que ya están completos.
 */
/**
 * Meses que toca la ventana, en orden, con el índice del primer día de cada uno.
 *
 * Sirve para el selector de mes: con dos meses de horizonte, ir de a siete días
 * hasta el final son ocho clicks, y nadie los hace.
 *
 * El índice del primer mes es 0 aunque la ventana arranque a mitad de mes: lo
 * que interesa es "llevame al principio de lo que hay de este mes", no al día 1
 * de un mes que ya empezó.
 */
export function monthsInWindow(dates: string[]): { key: string; index: number }[] {
  const meses: { key: string; index: number }[] = [];
  dates.forEach((date, index) => {
    const key = date.slice(0, 7);
    if (meses.length === 0 || meses[meses.length - 1].key !== key) {
      meses.push({ key, index });
    }
  });
  return meses;
}

/**
 * Las celdas de un mes, alineadas para una grilla de siete columnas que empieza
 * en LUNES.
 *
 * Los huecos del principio son `null` y no fechas del mes anterior: pintar los
 * días de al lado en gris es una convención de calendarios donde todo el año es
 * navegable, y acá lo que está afuera del horizonte no se puede reservar. Un
 * hueco vacío dice eso sin que haya que interpretar un color.
 */
export function monthGrid(monthKey: string): (string | null)[] {
  const [year, month] = monthKey.split('-').map(Number);
  const primero = `${monthKey}-01`;
  // `weekdayOf` sigue la convención de `Date` (0 = domingo). La grilla arranca en
  // lunes, que es como se lee un calendario acá.
  const huecos = (weekdayOf(primero) + 6) % 7;
  const largo = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return [
    ...Array.from({ length: huecos }, () => null),
    ...Array.from({ length: largo }, (_, i) => `${monthKey}-${String(i + 1).padStart(2, '0')}`),
  ];
}

/** `2026-09` → `septiembre`. Sin el año: la ventana nunca abarca doce meses, así
 *  que no hay ambigüedad ni cuando cruza diciembre. */
export function formatMonth(key: string): string {
  return MONTHS[Number(key.slice(5, 7)) - 1];
}

/**
 * Índice de una fecha dentro de la ventana, o `-1` si cae afuera.
 *
 * Se busca en la lista real de días y no se calcula restando fechas: los días los
 * arma el backend en hora argentina y quien mira puede estar en otro huso, así
 * que la aritmética local se correría un día.
 */
export function indexOfDate(dates: string[], date: string): number {
  return dates.indexOf(date);
}

export function firstAvailableIndex(
  days: { slots: { status: string }[] }[],
): number {
  return days.findIndex((day) => day.slots.some((s) => s.status === 'AVAILABLE'));
}

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

/** `2026-09-02` → `2 de septiembre`. */
export function formatDate(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${day} de ${MONTHS[month - 1]}`;
}

/** `2026-09-02` → `2/9`, para los encabezados angostos de la grilla. */
export function formatShortDate(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${day}/${month}`;
}

/** Precio en pesos, sin decimales: los honorarios se cargan en enteros. */
export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
