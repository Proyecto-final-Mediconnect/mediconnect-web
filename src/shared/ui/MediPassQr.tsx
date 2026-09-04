/**
 * Ilustración de un código MediPass.
 *
 * **No es un QR real y no se puede escanear**: es una figura decorativa para las
 * vistas previas de la landing. El MediPass de verdad —código rotativo, sesión
 * revocable— es Release 3 (ENG-72, ENG-117). Cuando exista, esto se reemplaza
 * por el código real y este archivo se borra.
 *
 * El patrón se genera con una secuencia determinística en vez de `Math.random`
 * a propósito: si cambiara en cada render, el bloque titilaría al re-renderizar
 * y encima rompería cualquier test de snapshot.
 */

type MediPassQrProps = {
  /** Lado en píxeles. El SVG escala solo. */
  size?: number;
  className?: string;
};

/** Módulos por lado, sin contar el margen. Es la densidad de un QR chico real. */
const GRID = 25;

/** Esquinas donde van los ojos, en coordenadas de módulo. */
const FINDERS = [
  [0, 0],
  [GRID - 7, 0],
  [0, GRID - 7],
] as const;

/** ¿Esta celda cae dentro del cuadrado de 7×7 de un ojo (o su margen)? */
function isFinderZone(x: number, y: number): boolean {
  return FINDERS.some(([fx, fy]) => x >= fx - 1 && x <= fx + 7 && y >= fy - 1 && y <= fy + 7);
}

/**
 * Ruido reproducible. Un hash entero barato sobre (x, y): siempre da lo mismo
 * para la misma celda y no necesita estado ni semilla externa.
 */
function isFilled(x: number, y: number): boolean {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) & 0xff) > 118;
}

export function MediPassQr({ size = 118, className = '' }: MediPassQrProps) {
  const cells: React.ReactElement[] = [];

  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (isFinderZone(x, y) || !isFilled(x, y)) continue;
      cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />);
    }
  }

  return (
    <svg
      viewBox={`-1 -1 ${GRID + 2} ${GRID + 2}`}
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Código MediPass de ejemplo"
      shapeRendering="crispEdges"
    >
      <rect x="-1" y="-1" width={GRID + 2} height={GRID + 2} fill="#ffffff" />
      <g fill="#0b4f6c">
        {cells}
        {FINDERS.map(([fx, fy]) => (
          <g key={`${fx}-${fy}`}>
            <rect x={fx} y={fy} width="7" height="7" />
            <rect x={fx + 1} y={fy + 1} width="5" height="5" fill="#ffffff" />
            <rect x={fx + 2} y={fy + 2} width="3" height="3" />
          </g>
        ))}
      </g>
    </svg>
  );
}
