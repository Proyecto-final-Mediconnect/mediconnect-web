import { useEffect, useState } from 'react';

/**
 * Si la media query se cumple, y se actualiza cuando cambia (rotar, achicar la
 * ventana). Sin `matchMedia` —jsdom en los tests— responde `false`, que es la
 * versión angosta y la que se prueba.
 */
export function useMediaQuery(query: string): boolean {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches;
  const [matches, setMatches] = useState(get);

  useEffect(() => {
    const list = window.matchMedia?.(query);
    if (!list) return;
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Desde `lg` (1024 px): hay lugar para la lista y el detalle lado a lado. */
export const WIDE_QUERY = '(min-width: 1024px)';
