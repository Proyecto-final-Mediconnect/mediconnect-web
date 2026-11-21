import { useId, useState } from 'react';
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog';
import { formatDate } from '../../appointments/lib/weeks';
import type { AffectedAppointment } from '../types/schedule';

/** Largo del motivo para los pacientes. Espeja el DTO del backend. */
const MIN_REASON = 10;
const MAX_REASON = 500;

/**
 * El bloqueo pisa turnos tomados (ENG-206, ADR-018 caso 1): antes de confirmar,
 * el profesional ve cuáles son, qué le pasa a cada paciente y escribe el motivo
 * que ellos van a leer.
 *
 * Quien lo usa le pasa una `key` por bloqueo: así cada uno arranca con el
 * motivo vacío sin un efecto que lo resetee.
 */
export function BlockAppointmentsDialog({
  affected,
  pendiente,
  error,
  onCancel,
  onConfirm,
}: {
  /** `null` cierra el diálogo. */
  affected: AffectedAppointment[] | null;
  pendiente: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (cancellationReason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const fieldId = useId();
  const helpId = useId();

  const trimmed = reason.trim();
  const tooShort = trimmed.length < MIN_REASON;
  const n = affected?.length ?? 0;
  const pagados = affected?.filter((a) => a.paid).length ?? 0;

  return (
    <ConfirmDialog
      open={affected !== null}
      titulo={
        n === 1 ? 'Ese horario tiene un turno tomado' : `Ese horario tiene ${n} turnos tomados`
      }
      confirmar={
        pendiente
          ? 'Bloqueando…'
          : n === 1
            ? 'Bloquear y cancelar el turno'
            : 'Bloquear y cancelar los turnos'
      }
      cancelar="Volver"
      destructivo
      pendiente={pendiente}
      onCancel={onCancel}
      onConfirm={() => {
        setTouched(true);
        if (tooShort) return;
        onConfirm(trimmed);
      }}
    >
      {affected && (
        <>
          <ul className="grid gap-2" aria-label="Turnos que se cancelan">
            {affected.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-line-soft px-3 py-2"
              >
                <span>
                  <strong className="font-bold text-brand-deep">
                    {formatDate(a.date)} · {a.startTime}
                  </strong>{' '}
                  {a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : 'Paciente'}
                </span>
                <span className="text-[12px] font-semibold text-muted">
                  {a.paid ? 'Pagado' : 'Sin pagar'}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-3">
            {pagados > 0 &&
              'Los pacientes que ya pagaron van a poder elegir otro horario tuyo sin volver a pagar o pedir el reembolso del 100 %. '}
            {pagados < n && 'Las reservas sin pagar se cancelan. '}A todos les avisamos.
          </p>

          <div className="mt-4 grid gap-1.5">
            <label htmlFor={fieldId} className="text-sm font-semibold text-ink">
              Motivo para los pacientes
            </label>
            <textarea
              id={fieldId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onBlur={() => setTouched(true)}
              maxLength={MAX_REASON}
              rows={3}
              required
              placeholder="Por ejemplo: tengo un congreso ese día y no voy a estar."
              aria-invalid={touched && tooShort}
              aria-describedby={helpId}
              className={`w-full resize-y rounded-[10px] border bg-white px-4 py-3 text-sm leading-[1.6] text-ink outline-none transition-colors placeholder:text-muted-soft focus:border-brand focus-visible:ring-2 focus-visible:ring-brand ${
                touched && tooShort ? 'border-danger' : 'border-line-strong'
              }`}
            />
            <div id={helpId} className="flex justify-between gap-3 text-[12px]">
              {touched && tooShort ? (
                <span className="text-danger">
                  Contales por qué, en al menos {MIN_REASON} caracteres.
                </span>
              ) : (
                <span className="text-muted">Lo ven en el aviso de cancelación.</span>
              )}
              <span className="text-muted-soft" aria-live="polite">
                {reason.length}/{MAX_REASON}
              </span>
            </div>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-danger">
              {error}
            </p>
          )}
        </>
      )}
    </ConfirmDialog>
  );
}
