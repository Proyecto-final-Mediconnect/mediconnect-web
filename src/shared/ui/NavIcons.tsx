/**
 * Iconos del menú lateral.
 *
 * Existen porque la barra se contrae: en 72 píxeles no entra una etiqueta, y sin
 * icono el menú plegado sería una columna de cuadrados iguales. **No reemplazan
 * al texto**, lo acompañan — la etiqueta sigue en el DOM siempre, y es lo que
 * anuncia el lector de pantalla.
 *
 * Son de trazo y usan `currentColor`, así que heredan el color del enlace en cada
 * estado (activo, hover, apagado) sin duplicar la paleta acá. `viewBox` de 24 y
 * trazo de 1.75 en todos: dibujados a distinta escala se ven de distinto peso
 * aunque midan lo mismo.
 */

type IconProps = { className?: string };

const BASE = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function Svg({ className = '', children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg {...BASE} className={`h-5 w-5 flex-none ${className}`}>
      {children}
    </svg>
  );
}

/** Panel: cuatro módulos, la metáfora habitual de un tablero. */
export function IconPanel(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </Svg>
  );
}

/** Turnos: un calendario. */
export function IconTurnos(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Svg>
  );
}

/** Historia clínica: una hoja con el pulso, que es la firma de la marca. */
export function IconHistoria(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5" />
      <path d="M8 15h2l1.5-3 2 5 1.5-2h1" />
    </Svg>
  );
}

/**
 * MediPass: el marco de escaneo.
 *
 * Empezó siendo una grilla de cuatro cuadrados, como el QR real, y a 20 px se
 * confundía con el icono del Panel, que también es una grilla de cuatro. Las
 * esquinas de encuadre no se parecen a nada más del menú.
 */
export function IconMediPass(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </Svg>
  );
}

/** Buscar profesionales: la lupa. */
export function IconBuscar(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Svg>
  );
}

/** Perfil: una persona. */
export function IconPerfil(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </Svg>
  );
}

/** Agenda: reloj, que es lo que se configura — horarios, no fechas. */
export function IconAgenda(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  );
}

/** Videoconsulta: la cámara. */
export function IconVideo(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="2" y="6" width="13" height="12" rx="2" />
      <path d="m15 11 6-3.5v9L15 13" />
    </Svg>
  );
}

/** Moderación: un escudo con el visto. */
export function IconModeracion(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </Svg>
  );
}
