/**
 * Los sonidos del monitor, generados con Web Audio: no hay archivos que cargar
 * y anda sin red. El navegador no deja sonar nada hasta el primer toque del
 * usuario, así que el contexto se crea recién al empezar la guardia.
 */

let ctx: AudioContext | null = null;

function contexto(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null;
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tono(frecuencia: number, duracion: number, volumen = 0.08, desde = 0) {
  const c = contexto();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  const inicio = c.currentTime + desde;
  osc.type = 'sine';
  osc.frequency.value = frecuencia;
  gain.gain.setValueAtTime(0, inicio);
  gain.gain.linearRampToValueAtTime(volumen, inicio + 0.01);
  gain.gain.setValueAtTime(volumen, inicio + duracion - 0.03);
  gain.gain.linearRampToValueAtTime(0, inicio + duracion);
  osc.connect(gain).connect(c.destination);
  osc.start(inicio);
  osc.stop(inicio + duracion + 0.02);
}

export const sonido = {
  despertar: () => void contexto(),
  latido: () => tono(880, 0.07, 0.05),
  estabilizado: () => {
    tono(660, 0.12, 0.08);
    tono(990, 0.18, 0.08, 0.13);
  },
  /** El pitido largo del monitor plano. */
  muerte: () => tono(1000, 2.6, 0.1),
};
