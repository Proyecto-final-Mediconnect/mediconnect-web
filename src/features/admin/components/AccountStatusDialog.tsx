import { useId, useState } from 'react';
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog';
import type { AdminProfessionalDetail } from '../api/adminApi';
import { useChangeAccountStatus, useSuspensionPreview } from '../hooks/useAdmin';

/** Igual que el backend (`account-reason.dto.ts`). */
export const MIN_ACCOUNT_REASON = 10;
export const MAX_ACCOUNT_REASON = 500;

const plural = (n: number, uno: string, varios: string) => (n === 1 ? uno : varios);

/**
 * Suspender o reactivar a un profesional (ENG-241).
 *
 * Suspender muestra primero el impacto (cuántos turnos pagados se reembolsan y
 * cuántos impagos se cancelan), porque no se deshace: los turnos resueltos no
 * vuelven al reactivarlo. Los dos piden un motivo, que queda en la auditoría y,
 * al suspender, le llega al profesional por mail.
 */
export function AccountStatusDialog({
  professional,
  action,
  open,
  onClose,
  onDone,
}: {
  professional: AdminProfessionalDetail;
  action: 'suspension' | 'reactivation';
  open: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const suspender = action === 'suspension';
  const change = useChangeAccountStatus();
  const preview = useSuspensionPreview(professional.id, open && suspender);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const fieldId = useId();
  const helpId = useId();

  const nombre = `${professional.firstName} ${professional.lastName}`;
  const trimmed = reason.trim();
  const tooShort = trimmed.length < MIN_ACCOUNT_REASON;

  function cerrar() {
    change.reset();
    setReason('');
    setTouched(false);
    onClose();
  }

  return (
    <ConfirmDialog
      open={open}
      titulo={suspender ? `¿Suspender a ${nombre}?` : `¿Reactivar a ${nombre}?`}
      confirmar={change.isPending ? 'Guardando…' : suspender ? 'Sí, suspender' : 'Sí, reactivar'}
      cancelar="Volver"
      destructivo={suspender}
      pendiente={change.isPending || (suspender && preview.isPending)}
      onCancel={cerrar}
      onConfirm={() => {
        setTouched(true);
        if (tooShort) return;
        change.mutate(
          { id: professional.id, action, reason: trimmed },
          {
            onSuccess: (res) => {
              const resueltos = (res.refunded ?? 0) + (res.cancelled ?? 0);
              onDone(
                suspender
                  ? `Suspendiste a ${nombre}.${
                      resueltos > 0
                        ? ` Se ${plural(resueltos, 'resolvió 1 turno', `resolvieron ${resueltos} turnos`)} y les avisamos a los pacientes.`
                        : ''
                    }`
                  : `Reactivaste a ${nombre}. Ya aparece en el catálogo.`,
              );
              cerrar();
            },
          },
        );
      }}
    >
      {suspender ? (
        <>
          <p>Sale del catálogo y no puede recibir turnos nuevos hasta que lo reactives.</p>
          <div className="mt-3 rounded-[10px] bg-surface px-4 py-3" aria-live="polite">
            {preview.isPending ? (
              <p className="text-muted">Calculando qué turnos se ven afectados…</p>
            ) : preview.isError ? (
              <p className="text-danger">{preview.error.message}</p>
            ) : preview.data.paid + preview.data.unpaid === 0 ? (
              <p>No tiene turnos pendientes: no se cancela ninguno.</p>
            ) : (
              <ul className="grid gap-1">
                {preview.data.paid > 0 && (
                  <li>
                    {plural(
                      preview.data.paid,
                      'Se reembolsa al 100 % 1 turno pagado.',
                      `Se reembolsan al 100 % ${preview.data.paid} turnos pagados.`,
                    )}
                  </li>
                )}
                {preview.data.unpaid > 0 && (
                  <li>
                    {plural(
                      preview.data.unpaid,
                      'Se cancela 1 reserva sin pagar.',
                      `Se cancelan ${preview.data.unpaid} reservas sin pagar.`,
                    )}
                  </li>
                )}
                <li className="text-muted">
                  A cada paciente le avisamos. Si lo reactivás, estos turnos no vuelven.
                </li>
              </ul>
            )}
          </div>
        </>
      ) : (
        <p>Vuelve a aparecer en el catálogo y los pacientes lo pueden reservar otra vez.</p>
      )}

      <div className="mt-4 grid gap-1.5">
        <label htmlFor={fieldId} className="text-sm font-semibold text-ink">
          Motivo
        </label>
        <textarea
          id={fieldId}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => setTouched(true)}
          maxLength={MAX_ACCOUNT_REASON}
          rows={3}
          required
          placeholder={
            suspender
              ? 'Por ejemplo: la matrícula figura suspendida en el colegio.'
              : 'Por ejemplo: el colegio confirmó que la matrícula está vigente otra vez.'
          }
          aria-invalid={touched && tooShort}
          aria-describedby={helpId}
          className={`w-full resize-y rounded-[10px] border bg-white px-4 py-3 text-sm leading-[1.6] text-ink outline-none transition-colors placeholder:text-muted-soft focus:border-brand focus-visible:ring-2 focus-visible:ring-brand ${
            touched && tooShort ? 'border-danger' : 'border-line-strong'
          }`}
        />
        <div id={helpId} className="flex justify-between gap-3 text-[12px]">
          {touched && tooShort ? (
            <span className="text-danger">
              Escribí el motivo en al menos {MIN_ACCOUNT_REASON} caracteres.
            </span>
          ) : (
            <span className="text-muted">
              {suspender
                ? 'Queda registrado y el profesional lo recibe por mail.'
                : 'Queda registrado.'}
            </span>
          )}
          <span className="text-muted-soft" aria-live="polite">
            {reason.length}/{MAX_ACCOUNT_REASON}
          </span>
        </div>
      </div>

      {change.isError && (
        <p role="alert" className="mt-3 text-danger">
          {change.error.message}
        </p>
      )}
    </ConfirmDialog>
  );
}
