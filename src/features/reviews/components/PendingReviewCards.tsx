import { useState } from 'react';
import { Modal } from '../../../shared/ui/Modal';
import { useDismissPendingReview, usePendingReviews } from '../hooks/useReviews';
import type { PendingReview } from '../types';
import { ReviewForm } from './ReviewForm';
import { StarInput } from './Stars';

const FECHA = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  day: 'numeric',
  month: 'long',
});

/**
 * "¿Cómo fue tu consulta con…?" en el inicio del paciente (ENG-190), una
 * tarjeta por turno que falta reseñar. Tocar las estrellas abre el formulario
 * con esa calificación; la cruz la descarta y no vuelve en ningún dispositivo.
 *
 * Si la lista no carga no muestra nada: es una invitación, no algo que el
 * paciente esté esperando ver.
 */
export function PendingReviewCards() {
  const pendientes = usePendingReviews();
  const descartar = useDismissPendingReview();
  const [abierta, setAbierta] = useState<{ review: PendingReview; rating: number } | null>(null);

  const lista = pendientes.data ?? [];
  if (lista.length === 0) return null;

  return (
    <section aria-label="Consultas para calificar" className="grid gap-3">
      <ul className="grid gap-3">
        {lista.map((p) => {
          const nombre = `${p.professional.firstName} ${p.professional.lastName}`;
          return (
            <li
              key={p.appointmentId}
              className="flex flex-wrap items-center gap-4 rounded-[14px] border border-line bg-white px-4 py-3.5"
            >
              {p.professional.photoUrl ? (
                <img
                  src={p.professional.photoUrl}
                  alt=""
                  className="size-11 flex-none rounded-full object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex size-11 flex-none items-center justify-center rounded-full bg-surface-teal text-sm font-bold text-brand-deep"
                >
                  {p.professional.firstName.charAt(0)}
                  {p.professional.lastName.charAt(0)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-brand-deep">
                  ¿Cómo fue tu consulta con {nombre}?
                </p>
                <p className="text-xs text-muted">{FECHA.format(new Date(p.scheduledAt))}</p>
              </div>
              <StarInput value={0} onChange={(rating) => setAbierta({ review: p, rating })} />
              <button
                type="button"
                aria-label={`No calificar la consulta con ${nombre}`}
                // Solo se traba la tarjeta que se está descartando.
                disabled={descartar.isPending && descartar.variables === p.appointmentId}
                onClick={() => descartar.mutate(p.appointmentId)}
                className="flex size-8 flex-none items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" width="14" height="14">
                  <path
                    d="M5 5l10 10M15 5L5 15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>
      {descartar.isError && (
        <p role="alert" className="text-sm text-danger">
          {descartar.error.message}
        </p>
      )}

      <Modal
        open={abierta !== null}
        titulo="Dejar una reseña"
        descripcion={
          abierta
            ? `Sobre tu consulta con ${abierta.review.professional.firstName} ${abierta.review.professional.lastName}.`
            : undefined
        }
        onClose={() => setAbierta(null)}
      >
        {abierta && (
          <ReviewForm
            appointmentId={abierta.review.appointmentId}
            professionalName={`${abierta.review.professional.firstName} ${abierta.review.professional.lastName}`}
            initialRating={abierta.rating}
            onDone={() => setAbierta(null)}
            onCancel={() => setAbierta(null)}
          />
        )}
      </Modal>
    </section>
  );
}
