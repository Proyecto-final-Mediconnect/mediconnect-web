import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Panel que entra desde la derecha por encima de la pantalla (ENG-178), para ver
 * algo sin perder la lista de atrás: el detalle de un turno.
 *
 * Se cierra con la ✕, con Escape o tocando el fondo. Mientras está abierto el
 * foco arranca en el botón de cerrar y la página de atrás no scrollea.
 */
export function SideDrawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-night/40 motion-safe:animate-[drawer-fade_150ms_ease-out]"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-y-0 right-0 flex w-full max-w-[480px] flex-col bg-surface shadow-2xl motion-safe:animate-[drawer-in_200ms_ease-out]"
      >
        <header className="flex items-center justify-between gap-3 border-b border-line bg-white px-5 py-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-line-soft hover:text-brand-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  );
}
