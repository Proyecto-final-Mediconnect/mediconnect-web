import { useEffect, useState } from 'react';

/**
 * Reloj que dispara un re-render cada `intervalMs`.
 *
 * Existe por un caso concreto: el botón de "Ingresar a videoconsulta" tiene que
 * aparecer 10 minutos antes del turno (ENG-56). Sin un reloj, React no tiene
 * ningún motivo para volver a renderizar, así que el paciente que dejó la
 * pantalla abierta esperando vería el botón recién al recargar — justo el
 * usuario que más lo necesita.
 *
 * 30 segundos por defecto: suficiente para que el botón aparezca a tiempo sin
 * dejar un timer nervioso corriendo en una pestaña de fondo.
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
