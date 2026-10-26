/** Qué pasó con la devolución del turno que se acaba de cancelar (ENG-65). Solo
 *  lo dice la respuesta de la cancelación, así que se muestra hasta que se cierra. */
export function RefundOutcomeBanner({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-start justify-between gap-3 rounded-[12px] border border-brand/30 bg-surface-teal px-4 py-3 text-sm text-brand-deep"
    >
      <p className="min-w-0 flex-1">{text}</p>
      <button
        type="button"
        onClick={onClose}
        className="font-semibold underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        Entendido
      </button>
    </div>
  );
}
