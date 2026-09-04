/**
 * Cronómetro de la consulta en curso (ENG-56).
 *
 * El canvas muestra "En consulta 18:42" en la cabecera. Se cuenta desde que la
 * sala se abrió para esta persona, no desde el horario del turno: si el paciente
 * entra diez minutos tarde, lo que le importa al profesional es hace cuánto está
 * hablando, no hace cuánto debería haber empezado.
 */

/**
 * Milisegundos a `MM:SS`, o `H:MM:SS` cuando pasa la hora.
 *
 * Los minutos no se truncan a 59: una consulta de 75 minutos muestra `1:15:00`,
 * no `15:00`. Un valor negativo —el reloj del cliente atrasado respecto del
 * momento de entrada— se trata como cero en vez de mostrar un tiempo al revés.
 */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));

  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/**
 * Duración de la consulta en texto largo, para el encabezado del resumen:
 * "22 minutos".
 */
export function describeDuration(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  return `${minutes} minuto${minutes === 1 ? '' : 's'}`;
}

/** `Date` → `09:30`, hora local. */
export function formatClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
