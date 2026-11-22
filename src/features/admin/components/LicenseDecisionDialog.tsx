import { useId, useState } from 'react';
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog';
import type { LicenseDecision, LicenseQueueItem } from '../api/adminApi';
import { useDecideLicense } from '../hooks/useAdmin';

/** Igual que el backend (`decide-license.dto.ts`). */
export const MIN_LICENSE_REASON = 10;
export const MAX_LICENSE_REASON = 500;

/**
 * Confirmar la validación o el rechazo de una matrícula (ENG-192).
 *
 * Validar también pide confirmación: lo publica en el catálogo y desde ese
 * momento lo pueden reservar. Rechazar pide el motivo, que le llega al
 * profesional por mail; sin motivo no se manda nada.
 */
export function LicenseDecisionDialog({
  professional,
  decision,
  onClose,
  onDecided,
}: {
  professional: LicenseQueueItem | null;
  decision: LicenseDecision;
  onClose: () => void;
  onDecided: (message: string) => void;
}) {
  const decide = useDecideLicense();
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const fieldId = useId();
  const helpId = useId();

  const rechazo = decision === 'RECHAZADO';
  const trimmed = reason.trim();
  const tooShort = rechazo && trimmed.length < MIN_LICENSE_REASON;
  const nombre = professional ? `${professional.firstName} ${professional.lastName}` : '';

  function cerrar() {
    decide.reset();
    setReason('');
    setTouched(false);
    onClose();
  }

  return (
    <ConfirmDialog
      open={professional !== null}
      titulo={rechazo ? `¿Rechazar la matrícula de ${nombre}?` : `¿Validar a ${nombre}?`}
      confirmar={
        decide.isPending
          ? 'Guardando…'
          : rechazo
            ? 'Sí, rechazar la matrícula'
            : 'Sí, validar la matrícula'
      }
      cancelar="Volver"
      destructivo={rechazo}
      pendiente={decide.isPending}
      onCancel={cerrar}
      onConfirm={() => {
        setTouched(true);
        if (!professional || tooShort) return;
        decide.mutate(
          {
            professionalId: professional.id,
            decision,
            reason: rechazo ? trimmed : undefined,
          },
          {
            onSuccess: () => {
              onDecided(
                rechazo
                  ? `Rechazaste la matrícula de ${nombre}. Le avisamos por mail con el motivo.`
                  : `Validaste a ${nombre}. Ya aparece en el catálogo.`,
              );
              cerrar();
            },
          },
        );
      }}
    >
      {professional && (
        <>
          <p>
            Matrícula <span className="font-semibold">{professional.licenseNumber}</span>
            {professional.specialties.length > 0 && ` · ${professional.specialties.join(', ')}`}.
          </p>
          {rechazo ? (
            <>
              <p className="mt-2">
                No va a aparecer en el catálogo y le llega un mail con el motivo.
              </p>
              <div className="mt-4 grid gap-1.5">
                <label htmlFor={fieldId} className="text-sm font-semibold text-ink">
                  Motivo
                </label>
                <textarea
                  id={fieldId}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  onBlur={() => setTouched(true)}
                  maxLength={MAX_LICENSE_REASON}
                  rows={3}
                  required
                  placeholder="Por ejemplo: la matrícula no figura en el registro del colegio de la provincia."
                  aria-invalid={touched && tooShort}
                  aria-describedby={helpId}
                  className={`w-full resize-y rounded-[10px] border bg-white px-4 py-3 text-sm leading-[1.6] text-ink outline-none transition-colors placeholder:text-muted-soft focus:border-brand focus-visible:ring-2 focus-visible:ring-brand ${
                    touched && tooShort ? 'border-danger' : 'border-line-strong'
                  }`}
                />
                <div id={helpId} className="flex justify-between gap-3 text-[12px]">
                  {touched && tooShort ? (
                    <span className="text-danger">
                      Explicale el motivo en al menos {MIN_LICENSE_REASON} caracteres.
                    </span>
                  ) : (
                    <span className="text-muted">El profesional lo recibe por mail.</span>
                  )}
                  <span className="text-muted-soft" aria-live="polite">
                    {reason.length}/{MAX_LICENSE_REASON}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-2">
              Confirmá que la verificaste en el registro público. Va a aparecer en el catálogo y los
              pacientes lo van a poder reservar.
            </p>
          )}

          {decide.isError && (
            <p role="alert" className="mt-3 text-danger">
              {decide.error.message}
            </p>
          )}
        </>
      )}
    </ConfirmDialog>
  );
}
