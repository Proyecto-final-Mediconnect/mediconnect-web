import { useEffect } from 'react';

const NOMBRE_APP = 'MediConnect';

/**
 * Pone `<Pantalla> · MediConnect` como título de la pestaña mientras el
 * componente está montado, y devuelve el anterior al desmontar.
 */
export function usePageTitle(titulo: string) {
  useEffect(() => {
    const anterior = document.title;
    document.title = titulo ? `${titulo} · ${NOMBRE_APP}` : NOMBRE_APP;
    return () => {
      document.title = anterior;
    };
  }, [titulo]);
}
