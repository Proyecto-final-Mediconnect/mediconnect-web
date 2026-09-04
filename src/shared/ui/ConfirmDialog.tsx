import { useEffect, useRef } from 'react';

/**
 * Diálogo de confirmación.
 *
 * Es un `<dialog>` nativo y no un div con posición fija, y eso resuelve solo tres
 * cosas que a mano se olvidan: el foco queda atrapado adentro, `Escape` lo
 * cierra, y el resto de la página queda inerte para lector de pantalla. Con un
 * div hay que implementar las tres.
 *
 * El botón que confirma NO es el que recibe el foco al abrir. Quien abre un
 * diálogo de confirmación viene de un click y puede tener el dedo apoyado en
 * Enter; el foco arranca en cancelar, que es la salida sin consecuencias.
 */

type ConfirmDialogProps = {
  open: boolean;
  titulo: string;
  children: React.ReactNode;
  /** Texto del botón que confirma. Dice la acción, no "Aceptar". */
  confirmar: string;
  cancelar?: string;
  /** Marca la acción como destructiva: el botón va en rojo. */
  destructivo?: boolean;
  pendiente?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  titulo,
  children,
  confirmar,
  cancelar = 'Cancelar',
  destructivo = false,
  pendiente = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
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
        if (!pendiente) onCancel();
      }}
      aria-labelledby="confirm-titulo"
      // `m-auto` no es decorativo: el navegador centra un <dialog> modal con
      // `margin: auto`, y el preflight de Tailwind pone `margin: 0` en todos los
      // elementos, así que sin esto el diálogo queda pegado arriba a la izquierda.
      className="m-auto w-[calc(100%-2rem)] max-w-[420px] rounded-[14px] border border-line bg-white p-0 text-ink backdrop:bg-night/50 backdrop:backdrop-blur-[2px]"
    >
      <div className="p-7">
        <h2 id="confirm-titulo" className="font-display text-[24px] leading-[1.2] text-brand-deep">
          {titulo}
        </h2>
        <div className="mt-2.5 text-sm leading-[1.7] text-muted">{children}</div>

        <div className="mt-7 flex flex-wrap justify-end gap-3">
          {/* Cancelar va primero en el DOM para que sea lo que recibe el foco al
              abrir el diálogo. */}
          <button
            type="button"
            onClick={onCancel}
            disabled={pendiente}
            className="rounded-[9px] border border-line-strong bg-white px-5 py-2.5 text-sm font-bold text-brand-deep transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {cancelar}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pendiente}
            className={`rounded-[9px] px-5 py-2.5 text-sm font-bold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
              destructivo
                ? 'bg-danger hover:bg-danger/90 focus-visible:ring-danger'
                : 'bg-brand-deep hover:bg-night focus-visible:ring-brand'
            }`}
          >
            {confirmar}
          </button>
        </div>
      </div>
    </dialog>
  );
}
