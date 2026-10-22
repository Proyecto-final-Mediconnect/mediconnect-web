import { usePublicProfile } from '../../catalog/hooks/usePublicProfile';
import { formatPrice } from '../../appointments/lib/weeks';
import { refundPercentFor } from '../lib/policy';

/**
 * Cuánto le devolverían al paciente si cancela ahora un turno pagado (ENG-171).
 *
 * La política sale del perfil público del profesional, que casi siempre ya está
 * en caché porque el paciente pasó por ahí para reservar. Si no se puede leer,
 * no se muestra nada: es preferible no decir un porcentaje que decir uno falso.
 *
 * Mientras no esté ENG-65 el reembolso no se pide solo a MercadoPago, y el texto
 * no lo promete.
 */
export function RefundEstimate({
  professionalId,
  scheduledAt,
  price,
  currency,
  now,
  className = '',
}: {
  professionalId: string;
  scheduledAt: string;
  price: number;
  currency: string;
  now: Date;
  className?: string;
}) {
  const profile = usePublicProfile(professionalId);
  const policy = profile.data?.cancellationPolicy;

  if (!policy) return null;

  const pct = refundPercentFor(policy, new Date(scheduledAt), now);
  const monto = formatPrice((price * pct) / 100, currency);

  return (
    <p className={`text-sm ${className}`}>
      {pct === 0
        ? 'Según la política del profesional, si cancelás ahora no te corresponde devolución.'
        : `Según la política del profesional, te corresponde ${
            pct === 100 ? 'la devolución total' : `el ${pct} %`
          } (${monto}). Por ahora la devolución no se hace sola: se gestiona aparte.`}
    </p>
  );
}
