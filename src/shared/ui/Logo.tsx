/**
 * Logo de MediConnect.
 *
 * Son **imágenes**, no una recreación con tipografía: el logo tiene su propia
 * letra y su propio corazón, y redibujarlo con la fuente de la interfaz daría
 * algo parecido pero distinto en cada pantalla. Los tres archivos salen del mismo
 * original, así que no pueden divergir entre sí.
 *
 * - `lockup` + `dark`  → `logo-horizontal.png`, texto azul, para fondos claros.
 * - `lockup` + `light` → `logo-horizontal-light.png`, texto blanco. No es un
 *   filtro CSS sobre el anterior: invertir con `brightness` también blanquearía el
 *   corazón, que tiene que quedar teal. Es un archivo aparte donde solo el texto
 *   cambia, y sin la sombra, que sobre fondo oscuro deja un halo sucio.
 * - `mark` → `logo-mark.png`, solo el corazón. Para espacios angostos y para
 *   cuando el nombre ya está escrito al lado.
 *
 * El `alt` va vacío cuando el logo es el contenido de un enlace que ya tiene
 * `aria-label`: si no, el lector de pantalla lee el nombre dos veces.
 */

type LogoProps = {
  /** `lockup` es el logo con el nombre; `mark`, solo el corazón. */
  variant?: 'lockup' | 'mark';
  /** `light` para fondos oscuros. Solo aplica al lockup. */
  tone?: 'dark' | 'light';
  /**
   * Texto alternativo. Vacío por defecto porque casi siempre vive dentro de un
   * enlace que ya se anuncia solo.
   */
  alt?: string;
  className?: string;
};

const FUENTES = {
  'lockup-dark': '/logo-horizontal.png',
  'lockup-light': '/logo-horizontal-light.png',
  mark: '/logo-mark.png',
} as const;

export function Logo({
  variant = 'lockup',
  tone = 'dark',
  alt = '',
  className = '',
}: LogoProps) {
  const src = variant === 'mark' ? FUENTES.mark : FUENTES[`lockup-${tone}`];

  return (
    <img
      src={src}
      alt={alt}
      // `w-auto` y no un ancho fijo: la relación de aspecto del lockup y la de la
      // marca no son la misma, así que quien lo usa fija el alto y nada más.
      className={`w-auto ${className}`}
    />
  );
}
