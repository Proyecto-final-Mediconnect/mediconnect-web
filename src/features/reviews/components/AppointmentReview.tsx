import { useState } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { useMyReviews } from '../hooks/useReviews';
import { STATUS_LABELS } from '../lib/reviews';
import { ReviewForm } from './ReviewForm';
import { Stars } from './Stars';

const TONO = {
  PENDIENTE_MODERACION: 'bg-tag-warm text-tag-warm-ink',
  APROBADA: 'bg-surface-teal text-brand-hover',
  RECHAZADA: 'bg-danger/10 text-danger',
} as const;

/**
 * La reseña de una consulta terminada, en el detalle del turno (ENG-80): el
 * botón para dejarla o, si ya la dejó, en qué quedó.
 */
export function AppointmentReview({
  appointmentId,
  professionalName,
}: {
  appointmentId: string;
  professionalName: string;
}) {
  const mias = useMyReviews();
  const [abierto, setAbierto] = useState(false);
  const resena = mias.data?.find((r) => r.appointmentId === appointmentId);

  if (mias.isPending) return null;

  if (mias.isError) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-danger/30 bg-danger/5 px-4 py-3 text-[13px] text-danger"
      >
        <span>{mias.error.message}</span>
        <button
          type="button"
          disabled={mias.isFetching}
          onClick={() => void mias.refetch()}
          className="rounded-[9px] px-3 py-1.5 font-semibold transition-colors hover:bg-danger/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
        >
          {mias.isFetching ? 'Reintentando…' : 'Reintentar'}
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-2 rounded-[12px] border border-line-soft bg-surface px-4 py-3.5">
      {resena ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-brand-deep">Tu reseña</span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${TONO[resena.status]}`}
            >
              {STATUS_LABELS[resena.status]}
            </span>
          </div>
          <Stars value={resena.rating} />
          {resena.comment && (
            <p className="text-[13px] leading-[1.6] text-ink">“{resena.comment}”</p>
          )}
          {resena.status === 'RECHAZADA' && resena.moderationReason && (
            <p className="text-[12px] text-danger">Motivo: {resena.moderationReason}</p>
          )}
        </>
      ) : (
        <>
          <p className="text-[13px] leading-[1.6] text-muted">
            ¿Cómo te fue con {professionalName}? Tu reseña ayuda a otros pacientes a elegir.
          </p>
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="inline-flex items-center justify-center gap-2 rounded-[10px] bg-brand-deep px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Dejar una reseña
          </button>
        </>
      )}

      <Modal
        open={abierto}
        titulo="Dejar una reseña"
        descripcion={`Sobre tu consulta con ${professionalName}.`}
        onClose={() => setAbierto(false)}
      >
        {abierto && (
          <ReviewForm
            appointmentId={appointmentId}
            professionalName={professionalName}
            onDone={() => setAbierto(false)}
            onCancel={() => setAbierto(false)}
          />
        )}
      </Modal>
    </div>
  );
}
