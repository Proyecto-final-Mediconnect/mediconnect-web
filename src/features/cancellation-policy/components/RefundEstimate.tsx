import { useQuery } from '@tanstack/react-query';
import { getCancellationQuote } from '../../appointments/api/appointmentsApi';
import { formatPrice } from '../../appointments/lib/weeks';
import { usePublicProfile } from '../../catalog/hooks/usePublicProfile';
import type { ApiError } from '../../../shared/api/apiError';
import { describePolicy, refundPercentFor, refundQuoteText } from '../lib/policy';

/**
 * Cuánto le devolverían al paciente si cancela ahora un turno pagado (ENG-171,
 * ENG-65).
 *
 * Lo calcula el backend (`cancellation-quote`) con la política que quedó guardada
 * en el turno al reservarlo, que es la que vale. Si el backend todavía no la
 * tiene (404: backend sin ENG-65), se cuenta acá con la política actual del
 * perfil público, avisando que la devolución no es automática. Si la cotización
 * falla por otra cosa (5xx, red), no se sabe si la devolución es automática: se
 * dice que no se pudo calcular y se muestra la política, sin porcentaje. Si
 * tampoco se puede leer el perfil, en el caso del 404 no se muestra nada: es
 * preferible no decir un porcentaje que decir uno falso.
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
  } else if (quote.isError) {
    const policy = profile.data?.cancellationPolicy;
    if ((quote.error as Partial<ApiError>).status === 404) {
      if (policy) {
        const pct = refundPercentFor(policy, new Date(scheduledAt), now);
        texto = refundQuoteText(pct, formatPrice((price * pct) / 100, currency), false);
      }
    } else {
      texto = policy
        ? `No pudimos calcular la devolución ahora. Se aplica la política del profesional: ${describePolicy(policy)}`
        : 'No pudimos calcular la devolución ahora.';
    }
  }

  if (!texto) return null;

  return <p className={`text-sm ${className}`}>{texto}</p>;
}
