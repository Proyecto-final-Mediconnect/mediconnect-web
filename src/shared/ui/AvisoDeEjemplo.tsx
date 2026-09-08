import type { ReactNode } from 'react';

/**
 * Aviso de que lo que se ve abajo no sale de la base.
 *
 * Existe porque el mismo cartel estaba copiado en MediPass, la vista de
 * emergencia y el checkout, y hubo que ponerlo en dos pantallas más. Cuatro
 * copias de un texto que promete honestidad son cuatro lugares donde una puede
 * quedarse vieja y seguir diciendo que algo es de mentira cuando ya es de
 * verdad — o al revés, que es peor.
 *
 * El borde punteado no es decoración: es lo que distingue el bloque de una
 * tarjeta de contenido a simple vista, sin leerlo.
 */
export function AvisoDeEjemplo({
  titulo = 'Pantalla de ejemplo.',
  children,
  className = '',
}: {
  /** Qué es lo de ejemplo. Cambia cuando el aviso cubre una sección y no la
   *  pantalla entera. */
  titulo?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`rounded-[14px] border border-dashed border-line-strong bg-surface px-5 py-4 text-[13px] leading-[1.7] text-muted ${className}`}
    >
      <strong className="font-bold text-brand-deep">{titulo}</strong> {children}
    </p>
  );
}
