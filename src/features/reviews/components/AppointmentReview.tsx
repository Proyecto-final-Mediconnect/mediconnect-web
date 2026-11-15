import { useState } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { useMyReviews } from '../hooks/useReviews';
import { ReviewForm } from './ReviewForm';
import { Stars } from './Stars';

/**
 * La reseña de una consulta terminada, en el detalle del turno (ENG-80): el
 * botón para dejarla o, si ya la dejó, la reseña.
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
          <span className="text-[13px] font-semibold text-brand-deep">Tu reseña</span>
          <Stars value={resena.rating} />
          {resena.comment && (
            <p className="text-[13px] leading-[1.6] text-ink">“{resena.comment}”</p>
          )}
          {/* Solo reseñas viejas: de cuando había moderación. Ya no hay quien las
              revise, así que lo que no está APROBADA no se publicó (review de #113). */}
          {resena.status === 'RECHAZADA' && (
            <p className="text-[12px] text-danger">
              No se publicó{resena.moderationReason ? `: ${resena.moderationReason}` : '.'}
            </p>
          )}
          {resena.status === 'PENDIENTE_MODERACION' && (
            <p className="text-[12px] text-muted">
              Esta reseña es de una etapa anterior y no llegó a publicarse en el perfil del
              profesional.
            </p>
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
