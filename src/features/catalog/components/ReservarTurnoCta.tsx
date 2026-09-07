import { Link } from 'react-router-dom';
import { useSession } from '../../auth/hooks/useSession';

/**
 * El botón de reservar, que sabe si quien mira puede usarlo.
 *
 * Reservar es una acción de PACIENTE: la ruta `/profesionales/:id/turnos` está
 * detrás de `RequireAuth allow={['PACIENTE']}`. Con la sesión de un profesional
 * abierta, tocarlo llevaba de vuelta a su propio panel sin decir nada —el guard
 * redirige al dashboard del rol para no dejar a nadie en un 403—, y desde afuera
 * eso se ve como un salto inexplicable.
 *
 * La regla vive acá y no en cada pantalla porque el mismo botón aparece en la
 * tarjeta del catálogo y en el perfil público, y son dos lugares donde es fácil
 * que uno se arregle y el otro no.
 *
 * Al anónimo SÍ se le ofrece: ahí el guard hace lo correcto, lo manda a
 * `/ingresar` guardando a dónde quería ir y vuelve solo después del login. Ese
 * no es un callejón, es el camino.
 */
export function ReservarTurnoCta({
  professionalId,
  label,
  ariaLabel,
  layout = '',
  botonClassName,
}: {
  professionalId: string;
  label: string;
  ariaLabel?: string;
  /** Posición dentro del contenedor (márgenes, ancho). Lo comparten el botón y
   *  el aviso, porque los dos ocupan el mismo lugar en la grilla. */
  layout?: string;
  /** Pintura del botón: color, tipografía, padding. NO se aplica al aviso — si
   *  se compartiera, el cartel explicativo saldría con el fondo del botón. */
  botonClassName: string;
}) {
  const { user } = useSession();

  if (user !== null && user.role !== 'PACIENTE') {
    return (
      <p
        className={`${layout} rounded-[10px] border border-dashed border-line-strong bg-surface px-3 py-3 text-center text-xs font-medium leading-snug text-muted`}
      >
        Las reservas son para cuentas de paciente. Tenés la sesión abierta como{' '}
        {user.role === 'PROFESIONAL' ? 'profesional' : 'moderador'}.
      </p>
    );
  }

  return (
    <Link
      to={`/profesionales/${professionalId}/turnos`}
      aria-label={ariaLabel}
      className={`${layout} ${botonClassName}`}
    >
      {label}
    </Link>
  );
}
