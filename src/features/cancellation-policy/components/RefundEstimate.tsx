import { useQuery } from '@tanstack/react-query';
import { getCancellationQuote } from '../../appointments/api/appointmentsApi';
import { formatPrice } from '../../appointments/lib/weeks';
import { usePublicProfile } from '../../catalog/hooks/usePublicProfile';
import { refundPercentFor, refundQuoteText } from '../lib/policy';

/**
 * Cuánto le devolverían al paciente si cancela ahora un turno pagado (ENG-171,
 * ENG-65).
 *
 * Lo calcula el backend (`cancellation-quote`) con la política que quedó guardada
 * en el turno al reservarlo, que es la que vale. Si el backend todavía no la
 * tiene, se cuenta acá con la política actual del perfil público, avisando que la
 * devolución no es automática. Si tampoco se puede leer el perfil, no se muestra
 * nada: es preferible no decir un porcentaje que decir uno falso.
 */
export function RefundEstimate({
  appointmentId,
  professionalId,
  scheduledAt,
  price,
  currency,
  now,
  className = '',
}: {
  appointmentId: string;
  professionalId: string;
  scheduledAt: string;
  price: number;
  currency: string;
  now: Date;
  className?: string;
}) {
  const quote = useQuery({
    queryKey: ['appointments', appointmentId, 'cancellation-quote'],
    queryFn: () => getCancellationQuote(appointmentId),
    retry: false,
    // Depende de la hora: con el tiempo el porcentaje baja.
    staleTime: 0,
    gcTime: 0,
  });
  const profile = usePublicProfile(professionalId);

  let texto: string | null = null;
  if (quote.data) {
    texto = refundQuoteText(quote.data.percent, formatPrice(quote.data.amount, currency), true);
  } else if (quote.isError && profile.data?.cancellationPolicy) {
    const pct = refundPercentFor(profile.data.cancellationPolicy, new Date(scheduledAt), now);
    texto = refundQuoteText(pct, formatPrice((price * pct) / 100, currency), false);
  }

  if (!texto) return null;

  return <p className={`text-sm ${className}`}>{texto}</p>;
}
