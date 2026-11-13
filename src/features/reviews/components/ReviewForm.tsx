import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { useCreateReview } from '../hooks/useReviews';
import { StarInput } from './Stars';

const MAX = 1000;

/**
 * Dejar la reseña de una consulta (ENG-80): las estrellas y, si quiere, un
 * comentario. Se publica recién cuando la aprueba un moderador, y el formulario
 * lo dice antes de mandar, no después.
 */
export function ReviewForm({
  appointmentId,
  professionalName,
  onDone,
  onCancel,
  initialRating = 0,
  cancelLabel = 'Cancelar',
}: {
  appointmentId: string;
  professionalName: string;
  onDone: () => void;
  onCancel: () => void;
  /** Las estrellas que ya tocó en la tarjeta del inicio (ENG-190). */
  initialRating?: number;
  /** "Ahora no" en la pantalla de cierre de la consulta (ENG-190). */
  cancelLabel?: string;
}) {
  const crear = useCreateReview(appointmentId);
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState('');
  const [falta, setFalta] = useState(false);

  function enviar(event: React.FormEvent) {
    event.preventDefault();
    if (!rating) {
      setFalta(true);
      return;
    }
    crear.mutate({ rating, comment: comment.trim() || undefined }, { onSuccess: onDone });
  }

  return (
    <form onSubmit={enviar} noValidate className="grid gap-5">
      <div className="grid gap-2">
        <StarInput
          value={rating}
          onChange={(v) => {
            setRating(v);
            setFalta(false);
          }}
          disabled={crear.isPending}
        />
        {falta && (
          <p role="alert" className="text-[13px] text-danger">
            Elegí de 1 a 5 estrellas.
          </p>
        )}
      </div>

      <label className="grid gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          Comentario (opcional)
        </span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={MAX}
          rows={4}
          placeholder={`¿Cómo fue la consulta con ${professionalName}?`}
          disabled={crear.isPending}
          className="w-full resize-y rounded-[10px] border border-line-strong bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none transition-colors placeholder:text-muted-soft focus:border-brand focus:ring-2 focus:ring-brand/25"
        />
        <span className="justify-self-end text-[11px] tabular-nums text-muted-soft">
          {comment.length}/{MAX}
        </span>
      </label>

      <p className="rounded-[10px] bg-surface px-4 py-3 text-[13px] leading-[1.6] text-muted">
        Se publica en su perfil cuando la revise un moderador. Va con tu nombre y la inicial de tu
        apellido.
      </p>

      {crear.isError && (
        <p
          role="alert"
          className="rounded-[10px] border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {crear.error.message}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={crear.isPending}>
          {cancelLabel}
        </Button>
        <Button type="submit" disabled={crear.isPending}>
          {crear.isPending ? 'Enviando…' : 'Enviar reseña'}
        </Button>
      </div>
    </form>
  );
}
