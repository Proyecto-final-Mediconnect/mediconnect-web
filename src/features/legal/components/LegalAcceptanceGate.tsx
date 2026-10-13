import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../../shared/ui/Button';
import { SESSION_QUERY_KEY, useLogout } from '../../auth/hooks/useSession';
import { acceptLegal } from '../api/acceptLegal';
import { LEGAL_REQUIRED_MESSAGE, LEGAL_VERSION_LABEL } from '../legal';
import { LegalConsentField } from './LegalConsentField';

/**
 * Se muestra en lugar de la app cuando el usuario no aceptó la versión vigente
 * de los textos legales (ENG-140): quien tenía cuenta antes de que existieran, o
 * cuando cambian.
 *
 * Bloquea a propósito: sin consentimiento no se pueden tratar sus datos de
 * salud, y casi todas las pantallas de la app los muestran. Las dos salidas son
 * aceptar o cerrar sesión.
 */
export function LegalAcceptanceGate() {
  const queryClient = useQueryClient();
  const logout = useLogout();
  const [checked, setChecked] = useState(false);
  const [intentado, setIntentado] = useState(false);

  const aceptar = useMutation({
    mutationFn: acceptLegal,
    // Responde el perfil actualizado: se escribe en la sesión y la app aparece.
    onSuccess: (user) => queryClient.setQueryData(SESSION_QUERY_KEY, user),
  });

  function continuar() {
    setIntentado(true);
    if (checked) aceptar.mutate();
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-surface px-4 py-10">
      <section
        aria-labelledby="legal-gate-titulo"
        className="w-full max-w-[560px] rounded-[14px] border border-line bg-white p-7 lg:p-9"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          Antes de seguir
        </p>
        <h1
          id="legal-gate-titulo"
          className="font-display mt-2.5 text-[28px] leading-[1.15] text-brand-deep [text-wrap:balance]"
        >
          Necesitamos tu consentimiento
        </h1>
        <p className="mt-3 text-sm leading-[1.7] text-muted">
          MediConnect guarda tu historia clínica y otros datos de salud. Para tratarlos, la ley nos
          pide tu consentimiento expreso. Publicamos los términos, la política de privacidad y el
          consentimiento el {LEGAL_VERSION_LABEL}: leelos y, si estás de acuerdo, aceptalos para
          seguir.
        </p>

        <div className="mt-6">
          <LegalConsentField
            checked={checked}
            onChange={setChecked}
            error={intentado && !checked ? LEGAL_REQUIRED_MESSAGE : undefined}
          />
        </div>

        {aceptar.isError && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {aceptar.error.message}
          </p>
        )}

        <div className="mt-6 grid gap-3">
          <Button type="button" fullWidth onClick={continuar} disabled={aceptar.isPending}>
            {aceptar.isPending ? 'Guardando…' : 'Aceptar y continuar'}
          </Button>
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="text-center text-[13px] font-semibold text-muted underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-60"
          >
            Cerrar sesión
          </button>
        </div>
      </section>
    </main>
  );
}
