/**
 * La tabla de tiempos del stand.
 *
 * Vive en el `localStorage` de la notebook del stand y nada más: es una sola
 * máquina, y la tabla de verdad es la pizarra. Si el almacenamiento falla
 * (navegación privada, bloqueado), el juego sigue andando sin tabla.
 */

export type Marca = { apodo: string; ms: number; fecha: string };

const CLAVE = 'guardia.ranking.v1';
const MAXIMO = 10;

export function leerRanking(): Marca[] {
  try {
    const crudo = localStorage.getItem(CLAVE);
    const marcas = crudo ? (JSON.parse(crudo) as Marca[]) : [];
    return Array.isArray(marcas) ? marcas : [];
  } catch {
    return [];
  }
}

/** Guarda la marca y devuelve la tabla nueva y el puesto (1-based, o null si no entró). */
export function guardarMarca(marca: Marca): { ranking: Marca[]; puesto: number | null } {
  const todas = [...leerRanking(), marca].sort((a, b) => a.ms - b.ms);
  const ranking = todas.slice(0, MAXIMO);
  const indice = ranking.indexOf(marca);
  try {
    localStorage.setItem(CLAVE, JSON.stringify(ranking));
  } catch {
    // Sin almacenamiento: la marca se muestra igual, solo no queda.
  }
  return { ranking, puesto: indice === -1 ? null : indice + 1 };
}

export function borrarRanking(): void {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // Nada que borrar.
  }
}

/** `mm:ss.d` — la décima es lo que desempata en la pizarra. */
export function formatearTiempo(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 100));
  const decimas = total % 10;
  const segundos = Math.floor(total / 10) % 60;
  const minutos = Math.floor(total / 600);
  return `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}.${decimas}`;
}
