/** Lo que tiene el paciente para pagar desde que reservó (ENG-101). */
const MINUTOS_PARA_PAGAR = 15;

/** Milisegundos hasta que se libera la reserva, o `null` si no se sabe cuándo se reservó. */
export function restanteParaPagar(createdAt: string | null | undefined, now: Date): number | null {
  if (!createdAt) return null;
  const desde = new Date(createdAt).getTime();
  if (Number.isNaN(desde)) return null;
  return Math.max(0, desde + MINUTOS_PARA_PAGAR * 60_000 - now.getTime());
}

/** `12:05`. */
export function formatRestante(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutos = Math.floor(total / 60);
  const segundos = total % 60;
  return `${minutos}:${String(segundos).padStart(2, '0')}`;
}
