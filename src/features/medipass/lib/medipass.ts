import type { EmergencyScope, MediPassAccess } from '../types/medipass';

/**
 * Reglas del MediPass (EP-05).
 *
 * Puras y testeadas, como el resto: cuando existan los endpoints, esto no cambia.
 */

/**
 * Cada cuánto rota el código, en milisegundos.
 *
 * **Son los 5 minutos de ENG-72, no un número elegido acá.** El canvas dibuja un
 * código fijo (`MP-AR-8F42-91C7-D0A3`) y el ticket pide uno rotatorio, que es una
 * diferencia de seguridad y no de estilo: un código fijo es una credencial
 * permanente —quien lo vio una vez entra para siempre—, y uno que rota deja de
 * servir a los cinco minutos.
 */
export const ROTACION_MS = 5 * 60_000;

/** Cuánto dura una sesión de acceso. Son los 30 minutos de ENG-104. */
export const SESION_MS = 30 * 60_000;

/**
 * Milisegundos hasta la próxima rotación.
 *
 * Se calcula sobre el reloj absoluto y no sobre cuándo se abrió la pantalla: el
 * código lo rota el servidor en ventanas fijas, así que dos personas mirando el
 * mismo MediPass tienen que ver el mismo tiempo restante.
 */
export function msHastaRotacion(now: Date, ventanaMs: number = ROTACION_MS): number {
  return ventanaMs - (now.getTime() % ventanaMs);
}

export type EstadoAcceso =
  | { estado: 'VIGENTE'; msRestantes: number }
  | { estado: 'VENCIDO' };

/**
 * Si un acceso sigue en pie.
 *
 * El corte es el instante de expiración: un acceso vencido hace un segundo ya no
 * ve nada, y mostrarlo como vigente le haría creer al paciente que alguien está
 * mirando su historia cuando no.
 */
export function estadoDeAcceso(acceso: MediPassAccess, now: Date = new Date()): EstadoAcceso {
  const restante = new Date(acceso.expiraEl).getTime() - now.getTime();

  return restante > 0 ? { estado: 'VIGENTE', msRestantes: restante } : { estado: 'VENCIDO' };
}

/** Los accesos que están mirando la historia ahora mismo. */
export function accesosVigentes(
  accesos: MediPassAccess[],
  now: Date = new Date(),
): MediPassAccess[] {
  return accesos.filter((acceso) => estadoDeAcceso(acceso, now).estado === 'VIGENTE');
}

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
 * El bloque vital NO se puede apagar.
 *
 * Es la razón de ser del MediPass: un médico de guardia que escanea el código
 * tiene que ver alergias y medicación, o el pasaporte no sirve para lo único que
 * no puede fallar. Los otros tres bloques sí son opcionales.
 */
export function normalizarAlcance(scopes: EmergencyScope[]): EmergencyScope[] {
  return scopes.includes('VITAL') ? scopes : ['VITAL', ...scopes];
}

/** Si un bloque se muestra con el alcance elegido. */
export function muestraBloque(scopes: EmergencyScope[], bloque: EmergencyScope): boolean {
  return normalizarAlcance(scopes).includes(bloque);
}
