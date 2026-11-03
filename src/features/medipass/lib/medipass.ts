import type { MediPassScope, VitalBlock } from '../types/medipass';
/**
 * Reglas del MediPass (EP-05). Puras y testeadas, como el resto.
 */

/**
 * `mm:ss` de lo que falta. Por encima de una hora se corta en `59:59`: no hay
 * nada en el MediPass que dure tanto, y un tercer campo confundiría más.
 */
export function cuentaRegresiva(ms: number): string {
  const total = Math.max(0, Math.min(Math.floor(ms / 1000), 59 * 60 + 59));
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

/**
 * La URL que codifica el QR: la vista de emergencia con el código cargado. El
 * médico la abre con la cámara del celular, sin instalar nada.
 */
export function emergencyUrl(origin: string, codigo: string): string {
  return `${origin}/medipass/emergencia?codigo=${encodeURIComponent(codigo)}`;
}

/** `AB12CD34` → `AB12-CD34`: de a cuatro se lee y se dicta sin errores. */
export function formatCodigo(codigo: string): string {
  const limpio = codigo.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  return limpio.length === 8 ? `${limpio.slice(0, 4)}-${limpio.slice(4)}` : limpio;
}

const BLOQUES_SCOPE = [
  'grupoSanguineo',
  'alergias',
  'medicacion',
  'condiciones',
  'contacto',
] as const satisfies readonly (keyof MediPassScope)[];

/**
 * La ficha como la ve el consultante (ENG-149): sin los bloques apagados. Es lo
 * mismo que hace el backend al responderle (`applyScope`).
 */
export function recortarPorScope(vital: VitalBlock, scope: MediPassScope | undefined): VitalBlock {
  if (!scope) return vital;
  const recortada: VitalBlock = { ...vital };
  for (const bloque of BLOQUES_SCOPE) if (!scope[bloque]) delete recortada[bloque];
  return recortada;
}
