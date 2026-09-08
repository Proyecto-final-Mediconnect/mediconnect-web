import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Diálogo modal para contenido, no para confirmar.
 *
 * Es un `<dialog>` nativo por lo mismo que `ConfirmDialog`: el foco queda
 * atrapado adentro, `Escape` lo cierra y el resto de la página queda inerte para
 * el lector de pantalla. Con un div hay que implementar las tres a mano y las
 * tres se olvidan.
 *
 * Se diferencia de `ConfirmDialog` en que el contenido manda: acá adentro va un
 * formulario que decide solo cuándo cerrarse, así que el pie de botones lo pone
 * quien lo usa y no este componente. Son dos usos distintos del mismo elemento,
 * y unificarlos dejaría un componente con la mitad de las props apagadas.
 */

type ModalProps = {
  open: boolean;
  titulo: string;
  /** Bajada opcional, debajo del título. */
  descripcion?: string;
  children: ReactNode;
  onClose: () => void;
  /**
   * Bloquea el cierre mientras hay algo en vuelo.
   *
   * Importa en la historia clínica: cerrar el diálogo con el POST a mitad de
   * camino dejaría a la persona sin saber si el asiento se guardó, y la tabla es
   * append-only — si se guardó, no hay vuelta atrás.
   */
  pendiente?: boolean;
};

export function Modal({
  open,
  titulo,
  descripcion,
  children,
  onClose,
  pendiente = false,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    // `showModal` y no `show`: es lo que activa el backdrop, la trampa de foco y
    // la inercia del resto de la página.
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      // El nativo cierra con Escape sin avisarle a React; sin esto el estado
      // quedaría en "abierto" y el diálogo no se podría volver a abrir.
      onCancel={(e) => {
        e.preventDefault();
        if (!pendiente) onClose();
      }}
      aria-labelledby="modal-titulo"
      // `m-auto`: el navegador centra un <dialog> modal con `margin: auto`, y el
      // preflight de Tailwind pone `margin: 0` en todo, así que sin esto queda
      // pegado arriba a la izquierda.
      // `max-h` + `overflow` porque acá entra un formulario largo: sin eso, en
      // una pantalla baja el botón de guardar queda fuera de alcance.
      className="m-auto max-h-[calc(100dvh-3rem)] w-[calc(100%-2rem)] max-w-[560px] overflow-y-auto rounded-[14px] border border-line bg-white p-0 text-ink backdrop:bg-night/50 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex items-start justify-between gap-4 border-b border-line-soft px-7 py-5">
        <div>
          <h2
            id="modal-titulo"
            className="font-display text-[24px] leading-[1.2] text-brand-deep"
          >
            {titulo}
          </h2>
          {descripcion && (
            <p className="mt-1.5 text-[13px] leading-[1.6] text-muted">{descripcion}</p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={pendiente}
          aria-label="Cerrar"
          className="-mr-2 -mt-1 flex h-9 w-9 flex-none items-center justify-center rounded-[9px] text-muted transition-colors hover:bg-surface hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-[18px] w-[18px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="px-7 py-6">{children}</div>
    </dialog>
  );
}
