import { useState } from 'react';
import { useProfessionalReviews } from '../hooks/useReviews';
import { formatAverage, formatReviewDate } from '../lib/reviews';
import type { PublicReview } from '../types';
import { Stars } from './Stars';

/**
 * Las reseñas aprobadas en el perfil público (ENG-82), con el promedio arriba.
 * Sin reseñas, el estado vacío se queda: que no haya es información en sí.
 */
export function ProfessionalReviews({
  professionalId,
  card,
}: {
  professionalId: string;
  /** La tarjeta del perfil, para que la sección se vea como las demás. */
  card: (titulo: string, children: React.ReactNode) => React.ReactNode;
}) {
  const [pagina, setPagina] = useState(1);
  const [anteriores, setAnteriores] = useState<PublicReview[]>([]);
  const resenas = useProfessionalReviews(professionalId, pagina);

  // Mientras llega la página nueva, `keepPreviousData` muestra la anterior: no
  // se suma, o quedaría repetida.
  const actuales = resenas.isPlaceholderData ? [] : (resenas.data?.reviews ?? []);
  const lista = [...anteriores, ...actuales];
  const rating = resenas.data?.rating;

  if (resenas.isPending && pagina === 1) {
    return card(
      'Reseñas',
      <p role="status" className="px-6 py-6 text-[13px] text-muted">
        Cargando reseñas…
      </p>,
    );
  }

  if (resenas.isError && lista.length === 0) {
    return card(
      'Reseñas',
      <p role="alert" className="px-6 py-6 text-[13px] text-danger">
        {resenas.error.message}
      </p>,
    );
  }

  if (lista.length === 0) {
    return card(
      'Reseñas',
      <div className="grid justify-items-center gap-1.5 px-6 py-8 text-center">
        <p className="text-[15px] font-semibold text-brand-deep">Todavía no tiene reseñas</p>
        <p className="max-w-[380px] text-[13px] leading-[1.6] text-muted">
          Solo puede dejar una reseña quien haya tenido una consulta con este profesional.
        </p>
      </div>,
    );
  }

  return card(
    'Reseñas',
    <>
      {rating && (
        <div className="flex flex-wrap items-center gap-3 border-b border-line-soft px-6 py-4">
          <span className="font-display text-[34px] leading-none text-brand-deep">
            {formatAverage(rating.average)}
          </span>
          <span className="grid gap-1">
            <Stars value={rating.average} size={18} />
            <span className="text-[12px] text-muted">
              {rating.count} {rating.count === 1 ? 'reseña' : 'reseñas'} de pacientes atendidos
            </span>
          </span>
        </div>
      )}
      <ul className="divide-y divide-line-soft">
        {lista.map((r) => (
          <li key={r.id} className="grid gap-2 px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2.5">
                <Stars value={r.rating} size={14} />
                <span className="text-[13px] font-semibold text-brand-deep">{r.author}</span>
              </span>
              <span className="text-[12px] text-muted-soft">{formatReviewDate(r.createdAt)}</span>
            </div>
            {r.comment && (
              <p className="text-[14px] leading-[1.65] text-ink text-pretty">{r.comment}</p>
            )}
            {r.response && (
              <div className="ml-3 border-l-2 border-brand/40 pl-3.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-hover">
                  Respuesta del profesional
                </p>
                <p className="mt-1 text-[13px] leading-[1.6] text-muted">{r.response.content}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
      {resenas.data?.hasMore && (
        <button
          type="button"
          disabled={resenas.isFetching}
          onClick={() => {
            setAnteriores(lista);
            setPagina((p) => p + 1);
          }}
          className="w-full border-t border-line-soft px-6 py-3 text-left text-[13px] font-semibold text-brand-hover hover:bg-surface disabled:opacity-60"
        >
          {resenas.isFetching ? 'Cargando…' : 'Ver más reseñas'}
        </button>
      )}
    </>,
  );
}
