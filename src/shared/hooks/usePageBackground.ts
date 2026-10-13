import { useEffect } from 'react';

/**
 * Pinta el fondo del documento —y la barra del navegador— mientras la pantalla
 * está montada.
 *
 * Existe por las pantallas oscuras que se abren en el celular, como la ficha del
 * juego del stand: el `body` es blanco, y en iOS el rebote del scroll y las zonas
 * de arriba y abajo muestran ese blanco alrededor de la página. Pintar solo el
 * `<main>` no alcanza, porque lo que se ve en el rebote es el documento.
 *
 * Al desmontar deja todo como estaba: el resto de la app sigue sobre blanco.
 */
export function usePageBackground(color: string) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const anteriores = [html.style.backgroundColor, body.style.backgroundColor];
    html.style.backgroundColor = color;
    body.style.backgroundColor = color;

    // `theme-color` tiñe la barra de Safari y de Chrome en el celular.
    const existente = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const meta = existente ?? document.createElement('meta');
    const contenidoAnterior = meta.content;
    if (!existente) {
      meta.name = 'theme-color';
      document.head.appendChild(meta);
    }
    meta.content = color;

    return () => {
      [html.style.backgroundColor, body.style.backgroundColor] = anteriores;
      if (existente) meta.content = contenidoAnterior;
      else meta.remove();
    };
  }, [color]);
}
