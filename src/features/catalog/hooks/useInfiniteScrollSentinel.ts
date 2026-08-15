import { useEffect, useRef } from 'react';

type Options = {
  hasNextPage: boolean;
  isFetching: boolean;
  onIntersect: () => void;
};

/**
 * Ref para un elemento centinela al final de la lista: cuando entra en
 * viewport, pide la página siguiente.
 *
 * Devuelve la ref sin fallar si `IntersectionObserver` no existe (jsdom, o un
 * browser viejo). En ese caso el centinela nunca dispara y la carga queda a
 * cargo del botón "Ver más", que siempre se renderiza.
 */
export function useInfiniteScrollSentinel({ hasNextPage, isFetching, onIntersect }: Options) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // La callback cambia en cada render; guardarla en una ref evita
  // desuscribir/resuscribir el observer en cada uno.
  const onIntersectRef = useRef(onIntersect);

  useEffect(() => {
    onIntersectRef.current = onIntersect;
  }, [onIntersect]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || isFetching) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onIntersectRef.current();
        }
      },
      // Se adelanta media pantalla para que la página siguiente ya esté
      // pedida cuando el usuario llegue al final.
      { rootMargin: '400px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetching]);

  return sentinelRef;
}
