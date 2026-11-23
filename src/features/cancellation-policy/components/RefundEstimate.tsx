import { useQuery } from '@tanstack/react-query';
import { getCancellationQuote } from '../../appointments/api/appointmentsApi';
import { formatPrice } from '../../appointments/lib/weeks';
import { usePublicProfile } from '../../catalog/hooks/usePublicProfile';
import { describePolicy, refundQuoteText } from '../lib/policy';

/**
 * Cuánto le devolverían al paciente si cancela ahora un turno pagado (ENG-171,
 * ENG-65).
 *
 * Lo calcula **solo el backend** (`cancellation-quote`), con la política que
 * quedó guardada en el turno al reservarlo, que es la que vale (ENG-229: la web
 * ya no repite la cuenta). Si la cotización falla, se dice que no se pudo
 * calcular y se muestra la política en palabras, sin porcentaje: es preferible
 * no decir un porcentaje que decir uno que no es.
 */
export function RefundEstimate({
  appointmentId,
  professionalId,
  currency,
  className = '',
}: {
  appointmentId: string;
  professionalId: string;
  currency: string;
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
    texto = refundQuoteText(quote.data.percent, formatPrice(quote.data.amount, currency));
  } else if (quote.isError) {
    const policy = profile.data?.cancellationPolicy;
    texto = policy
      ? `No pudimos calcular la devolución ahora. Se aplica la política del profesional: ${describePolicy(policy)}`
      : 'No pudimos calcular la devolución ahora.';
  }

  if (!texto) return null;

  return <p className={`text-sm ${className}`}>{texto}</p>;
}
