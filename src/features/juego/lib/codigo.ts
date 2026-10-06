import { CASOS, type Caso } from './casos';

/**
 * El código rotativo del juego.
 *
 * En el MediPass real el código lo emite el servidor y rota cada 5 minutos
 * (ENG-72). El juego no puede depender de eso: el stand no tiene red confiable y
 * los pacientes son ficticios. Así que el código se **deriva** del paciente y de
 * la ventana de 30 segundos en la que estamos, y el celular lo verifica solo,
 * probando cada paciente contra la ventana actual. No hay servidor en el medio:
 * la notebook y el celular solo comparten la hora.
 *
 * No es seguridad — cualquiera que lea este archivo puede calcularlo. Es para
 * que un código viejo deje de andar a los 30 segundos, que es lo que da el apuro.
 */

export const ROTACION_JUEGO_MS = 30_000;

/**
 * Margen para el escaneo que llega justo después de la rotación: entre que la
 * cámara lee el QR y el celular abre la página pasan un par de segundos, y
 * cortar en seco se sentiría como un error del juego, no del jugador.
 */
export const GRACIA_MS = 4_000;

/** Sin 0/O ni 1/I/L, que se confunden si alguien lo tipea a mano. */
const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const LARGO = 6;
const SAL = 'mediconnect-guardia';

export function ventanaDe(now: number): number {
  return Math.floor(now / ROTACION_JUEGO_MS);
}

export function msHastaRotar(now: number): number {
  return ROTACION_JUEGO_MS - (now % ROTACION_JUEGO_MS);
}

/** FNV-1a de 32 bits: chico, estable y suficiente para esto. */
function hash(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function codigoDe(casoId: string, ventana: number): string {
  let n = hash(`${SAL}:${casoId}:${ventana}`);
  let codigo = '';
  for (let i = 0; i < LARGO; i++) {
    codigo += ALFABETO[n % ALFABETO.length];
    n = Math.floor(n / ALFABETO.length);
  }
  return codigo;
}

export function normalizarCodigo(codigo: string): string {
  return codigo.replace(/[\s-]/g, '').toUpperCase();
}

/** `ABC123` → `ABC-123`, para leerlo en voz alta. */
export function formatearCodigo(codigo: string): string {
  return codigo.length === LARGO ? `${codigo.slice(0, 3)}-${codigo.slice(3)}` : codigo;
}

export type Lectura =
  | { estado: 'VIGENTE'; caso: Caso }
  | { estado: 'VENCIDO' }
  | { estado: 'INVALIDO' };

/** Hasta cuánto para atrás un código se reconoce como "vencido" y no como basura. */
const VENTANAS_RECONOCIBLES = 240; // dos horas

export function leerCodigo(entrada: string, now: number = Date.now()): Lectura {
  const codigo = normalizarCodigo(entrada);
  const v = ventanaDe(now);
  const enGracia = now % ROTACION_JUEGO_MS < GRACIA_MS;

  // La siguiente también vale: el reloj del celular puede ir un poco atrasado.
  const vigentes = enGracia ? [v, v + 1, v - 1] : [v, v + 1];
  for (const caso of CASOS) {
    if (vigentes.some((w) => codigoDe(caso.id, w) === codigo)) {
      return { estado: 'VIGENTE', caso };
    }
  }

  for (let w = v - 1; w >= v - VENTANAS_RECONOCIBLES; w--) {
    if (CASOS.some((caso) => codigoDe(caso.id, w) === codigo)) return { estado: 'VENCIDO' };
  }
  return { estado: 'INVALIDO' };
}

/** La URL que lleva el QR: la ficha del paciente, con el código cargado. */
export function urlDeFicha(origin: string, codigo: string): string {
  return `${origin}/juego/guardia/ficha?c=${codigo}`;
}
