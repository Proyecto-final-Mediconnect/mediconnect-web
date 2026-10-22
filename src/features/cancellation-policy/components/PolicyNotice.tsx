import { describePolicy } from '../lib/policy';
import type { CancellationPolicy } from '../types/cancellationPolicy';

/**
 * La política de cancelación de un profesional, para el paciente (ENG-171).
 *
 * Sin política —el perfil no la trajo, por ejemplo con un backend anterior a
 * ENG-67— cae al texto genérico que había antes, en vez de inventar valores.
 */
export function PolicyNotice({ policy }: { policy: CancellationPolicy | undefined }) {
  return (
    <p className="text-xs leading-[1.6] text-muted-soft">
      Vas a poder cancelarlo desde “Mis turnos”.{' '}
      {policy ? describePolicy(policy) : 'El plazo y el reembolso los define cada profesional.'}
    </p>
  );
}
