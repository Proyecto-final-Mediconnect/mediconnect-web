import { useState } from 'react';
import { Button } from '../shared/ui/Button';
import { ConfirmDialog } from '../shared/ui/ConfirmDialog';
import {
  useDeleteReviewResponse,
  useReceivedReviews,
  useSaveReviewResponse,
} from '../features/reviews/hooks/useReviews';
import { formatAverage, formatReviewDate } from '../features/reviews/lib/reviews';
import { Stars } from '../features/reviews/components/Stars';
import type { PublicReview } from '../features/reviews/types';
import { DashboardLayout } from './DashboardLayout';

/** El mismo tope que valida el backend (`REVIEW_RESPONSE_MAX_LENGTH`). */
export const RESPONSE_MAX_LENGTH = 1000;

/**
 * Mis reseñas (ENG-106): las reseñas publicadas que dejaron los pacientes, con
 * el promedio arriba, y la respuesta pública de cada una.
 *
 * Son las mismas que ve cualquiera en el perfil. La respuesta se publica al
 * guardarla, sin pasar por moderación: la firma el profesional con su nombre, y
 * el backend igual la pasa por el filtro de lenguaje (ENG-107).
 */
export function ProfessionalReviewsPage() {
  const resenas = useReceivedReviews();
  const paginas = resenas.data?.pages ?? [];
  const lista = paginas.flatMap((p) => p.reviews);
  const rating = paginas[0]?.rating;
  const sinResponder = lista.filter((r) => !r.response).length;

  return (
    <DashboardLayout
      barTitle="Mis reseñas"
      subtitle="Lo que dicen tus pacientes, tal como se ve en tu perfil público. Podés responder cada reseña."
    >
      <div className="grid max-w-[820px] gap-5">
        {resenas.isPending ? (
          <p role="status" className="text-[14px] text-muted">
            Cargando tus reseñas…
          </p>
        ) : resenas.isError && !resenas.data ? (
          <div role="alert" className="grid justify-items-start gap-3">
            <p className="text-[14px] text-danger">{resenas.error.message}</p>
            <Button variant="secondary" onClick={() => void resenas.refetch()}>
              Probá de nuevo
            </Button>
          </div>
        ) : lista.length === 0 ? (
          <section className="grid justify-items-center gap-1.5 rounded-[14px] border border-line bg-white px-6 py-10 text-center">
            <h2 className="text-[15px] font-semibold text-brand-deep">Todavía no tenés reseñas</h2>
            <p className="max-w-[420px] text-[13px] leading-[1.6] text-muted">
              Cuando un paciente deje una reseña después de su consulta y un moderador la apruebe,
              va a aparecer acá y en tu perfil público.
            </p>
          </section>
        ) : (
          <>
            {rating && (
              <section
                aria-label="Tu calificación"
                className="flex flex-wrap items-center gap-4 rounded-[14px] border border-line bg-white px-6 py-5"
              >
                <span className="font-display text-[44px] leading-none text-brand-deep">
                  {formatAverage(rating.average)}
                </span>
                <span className="grid gap-1">
                  <Stars value={rating.average} size={20} />
                  <span className="text-[13px] text-muted">
                    {rating.count} {rating.count === 1 ? 'reseña publicada' : 'reseñas publicadas'}
                    {sinResponder > 0 &&
                      ` · ${sinResponder} sin responder${resenas.hasNextPage ? ' de las cargadas' : ''}`}
                  </span>
                </span>
              </section>
            )}

            <ul className="grid gap-3">
              {lista.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </ul>

            {resenas.isFetchNextPageError && (
              <p role="alert" className="text-[13px] text-danger">
                {resenas.error.message}
              </p>
            )}
            {resenas.hasNextPage && (
              <Button
                variant="secondary"
                disabled={resenas.isFetchingNextPage}
                onClick={() => void resenas.fetchNextPage()}
              >
                {resenas.isFetchingNextPage ? 'Cargando…' : 'Ver más reseñas'}
              </Button>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function ReviewCard({ review }: { review: PublicReview }) {
  const [editando, setEditando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const borrar = useDeleteReviewResponse(review.id);

  return (
    <li className="grid gap-3 rounded-[14px] border border-line bg-white px-6 py-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2.5">
          <Stars value={review.rating} size={15} />
          <span className="text-[14px] font-semibold text-brand-deep">{review.author}</span>
        </span>
        <span className="text-[12px] text-muted-soft">{formatReviewDate(review.createdAt)}</span>
      </div>
      {review.comment ? (
        <p className="text-[14px] leading-[1.65] text-ink text-pretty">{review.comment}</p>
      ) : (
        <p className="text-[13px] italic text-muted">Calificó sin dejar comentario.</p>
      )}

      {editando ? (
        <ResponseEditor
          reviewId={review.id}
          initial={review.response?.content ?? ''}
          author={review.author}
          onDone={() => setEditando(false)}
        />
      ) : review.response ? (
        <div className="grid gap-2 rounded-[10px] border-l-2 border-brand/40 bg-surface px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-hover">
            Tu respuesta · {formatReviewDate(review.response.createdAt)}
          </p>
          <p className="whitespace-pre-wrap text-[13px] leading-[1.6] text-ink">
            {review.response.content}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" className="px-3! py-1.5!" onClick={() => setEditando(true)}>
              Editar
            </Button>
            <Button variant="ghost" className="px-3! py-1.5!" onClick={() => setBorrando(true)}>
              Borrar
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button variant="secondary" onClick={() => setEditando(true)}>
            Responder
          </Button>
        </div>
      )}

      {borrando && (
        <ConfirmDialog
          open
          titulo="¿Borrar tu respuesta?"
          confirmar="Borrar respuesta"
          destructivo
          pendiente={borrar.isPending}
          onConfirm={() => borrar.mutate(undefined, { onSuccess: () => setBorrando(false) })}
          onCancel={() => {
            setBorrando(false);
            borrar.reset();
          }}
        >
          <p>Deja de verse en tu perfil público. La reseña de {review.author} sigue publicada.</p>
          {borrar.isError && (
            <p role="alert" className="mt-2 text-danger">
              {borrar.error.message}
            </p>
          )}
        </ConfirmDialog>
      )}
    </li>
  );
}

function ResponseEditor({
  reviewId,
  initial,
  author,
  onDone,
}: {
  reviewId: string;
  initial: string;
  author: string;
  onDone: () => void;
}) {
  const [texto, setTexto] = useState(initial);
  const guardar = useSaveReviewResponse(reviewId);
  const limpio = texto.trim();
  const id = `respuesta-${reviewId}`;
  const avisoId = `${id}-aviso`;

  return (
    <form
      className="grid gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (limpio) guardar.mutate(limpio, { onSuccess: onDone });
      }}
    >
      <label htmlFor={id} className="text-[13px] font-semibold text-brand-deep">
        Tu respuesta a {author}
      </label>
      <textarea
        id={id}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          if (guardar.isError) guardar.reset();
        }}
        maxLength={RESPONSE_MAX_LENGTH}
        rows={4}
        autoFocus
        aria-describedby={avisoId}
        placeholder="Agradecé, aclará algo o contá cómo lo vas a mejorar. Se publica con tu nombre."
        className="w-full resize-y rounded-[10px] border border-line-strong px-3.5 py-2.5 text-[14px] leading-[1.5] text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
      />
      <p id={avisoId} className="text-[12px] text-muted">
        No incluyas datos de salud ni información que identifique al paciente.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12px] text-muted">
          {limpio.length} / {RESPONSE_MAX_LENGTH} · Se publica en tu perfil apenas la guardás.
        </span>
        <span className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onDone} disabled={guardar.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={!limpio || guardar.isPending}
            aria-busy={guardar.isPending}
          >
            {guardar.isPending ? 'Publicando…' : 'Publicar respuesta'}
          </Button>
        </span>
      </div>
      {guardar.isError && (
        <p role="alert" className="text-[13px] text-danger">
          {guardar.error.message}
        </p>
      )}
    </form>
  );
}
