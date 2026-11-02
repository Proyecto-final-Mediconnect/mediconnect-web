import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { Modal } from '../../../shared/ui/Modal';
import { useModerateReview, useModerationQueue } from '../hooks/useReviews';
import { formatReviewDate } from '../lib/reviews';
import type { ModerationReview, ReviewStatus } from '../types';
import { Stars } from './Stars';

const PESTANAS: { status: ReviewStatus; label: string }[] = [
  { status: 'PENDIENTE_MODERACION', label: 'Pendientes' },
  { status: 'APROBADA', label: 'Aprobadas' },
  { status: 'RECHAZADA', label: 'Rechazadas' },
];

/**
 * La cola de moderación (ENG-81): las reseñas pendientes, de la más vieja a la
 * más nueva, con aprobar y rechazar. Rechazar pide el motivo, que le llega al
 * paciente. Las aprobadas y rechazadas quedan a mano para revisar lo decidido.
 */
export function ModerationQueue() {
  const [status, setStatus] = useState<ReviewStatus>('PENDIENTE_MODERACION');
  const [pagina, setPagina] = useState(1);
  const cola = useModerationQueue(status, pagina);
  const moderar = useModerateReview();
  const [aRechazar, setARechazar] = useState<ModerationReview | null>(null);
  const [motivo, setMotivo] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);

  function decidir(review: ModerationReview, decision: 'APROBADA' | 'RECHAZADA', reason?: string) {
    setAviso(null);
    moderar.mutate(
      { id: review.id, decision: { decision, reason } },
      {
        onSuccess: () => {
          setARechazar(null);
          setMotivo('');
          setAviso(
            decision === 'APROBADA'
              ? `Aprobaste la reseña sobre ${review.professional.name}: ya se ve en su perfil.`
              : `Rechazaste la reseña sobre ${review.professional.name}. Le avisamos al paciente.`,
          );
        },
      },
    );
  }

  return (
    <div className="grid gap-5">
      <div role="tablist" aria-label="Estado de las reseñas" className="flex flex-wrap gap-2">
        {PESTANAS.map((t) => (
          <button
            key={t.status}
            type="button"
            role="tab"
            aria-selected={status === t.status}
            onClick={() => {
              setStatus(t.status);
              setPagina(1);
              setAviso(null);
            }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              status === t.status
                ? 'bg-brand-deep text-white'
                : 'bg-white text-brand-deep ring-1 ring-line-strong hover:ring-brand'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {aviso && (
        <p
          role="status"
          className="rounded-[12px] border border-brand/30 bg-surface-teal px-4 py-3 text-[13px] font-semibold text-brand-hover"
        >
          {aviso}
        </p>
      )}
      {moderar.isError && !aRechazar && (
        <p
          role="alert"
          className="rounded-[12px] border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {moderar.error.message}
        </p>
      )}

      {cola.isPending ? (
        <p role="status" className="text-sm text-muted">
          Cargando reseñas…
        </p>
      ) : cola.isError ? (
        <p role="alert" className="text-sm text-danger">
          {cola.error.message}
        </p>
      ) : cola.data.reviews.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-line-strong bg-white px-6 py-10 text-center">
          <p className="text-[15px] font-semibold text-brand-deep">
            {status === 'PENDIENTE_MODERACION'
              ? 'No hay reseñas para revisar'
              : 'Todavía no hay reseñas acá'}
          </p>
          {status === 'PENDIENTE_MODERACION' && (
            <p className="mt-1 text-[13px] text-muted">Cuando un paciente deje una, aparece acá.</p>
          )}
        </div>
      ) : (
        <ul className="grid gap-3">
          {cola.data.reviews.map((r) => (
            <li key={r.id} className="overflow-hidden rounded-[14px] border border-line bg-white">
              <div className="grid gap-2.5 px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Stars value={r.rating} />
                  <span className="text-[12px] text-muted-soft">
                    {formatReviewDate(r.createdAt)}
                  </span>
                </div>
                {r.comment ? (
                  <p className="text-[14px] leading-[1.65] text-ink text-pretty">{r.comment}</p>
                ) : (
                  <p className="text-[13px] italic text-muted-soft">
                    Sin comentario, solo la calificación.
                  </p>
                )}
                <p className="text-[12.5px] text-muted">
                  <span className="font-semibold text-brand-deep">{r.patient}</span> sobre{' '}
                  <span className="font-semibold text-brand-deep">{r.professional.name}</span>
                </p>
                {r.status === 'RECHAZADA' && r.moderationReason && (
                  <p className="text-[12.5px] text-danger">Motivo: {r.moderationReason}</p>
                )}
              </div>
              {r.status === 'PENDIENTE_MODERACION' && (
                <div className="flex justify-end gap-2 border-t border-line-soft bg-surface/60 px-5 py-3">
                  <button
                    type="button"
                    disabled={moderar.isPending}
                    onClick={() => {
                      moderar.reset();
                      setMotivo('');
                      setARechazar(r);
                    }}
                    className="rounded-[9px] px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
                  >
                    Rechazar
                  </button>
                  <button
                    type="button"
                    disabled={moderar.isPending}
                    onClick={() => decidir(r, 'APROBADA')}
                    className="rounded-[9px] bg-brand-deep px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-50"
                  >
                    Aprobar
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {cola.data && (pagina > 1 || cola.data.hasMore) && (
        <div className="flex justify-between">
          <Button variant="ghost" disabled={pagina === 1} onClick={() => setPagina((p) => p - 1)}>
            ← Anteriores
          </Button>
          <Button
            variant="ghost"
            disabled={!cola.data.hasMore}
            onClick={() => setPagina((p) => p + 1)}
          >
            Siguientes →
          </Button>
        </div>
      )}

      <Modal
        open={aRechazar !== null}
        titulo="Rechazar la reseña"
        descripcion="El paciente recibe el motivo. Escribilo para que entienda qué no se puede publicar."
        onClose={() => setARechazar(null)}
        pendiente={moderar.isPending}
      >
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (aRechazar && motivo.trim()) decidir(aRechazar, 'RECHAZADA', motivo.trim());
          }}
          className="grid gap-4"
        >
          <label className="grid gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
              Motivo
            </span>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Tiene insultos o datos personales de terceros."
              className="w-full resize-y rounded-[10px] border border-line-strong bg-white px-3.5 py-2.5 text-[14px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/25"
            />
          </label>
          {moderar.isError && (
            <p role="alert" className="text-sm text-danger">
              {moderar.error.message}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setARechazar(null)}
              disabled={moderar.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={moderar.isPending || !motivo.trim()}>
              {moderar.isPending ? 'Guardando…' : 'Rechazar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
