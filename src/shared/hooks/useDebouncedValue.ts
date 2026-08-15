import { useEffect, useState } from 'react';

/**
 * Devuelve `value` recién después de `delay` ms sin cambios. Evita disparar un
 * request del catálogo por cada tecla en los inputs de precio.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
