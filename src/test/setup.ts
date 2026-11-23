import { vi } from 'vitest';

/**
 * Ajustes del entorno de test.
 *
 * jsdom no implementa la API de `<dialog>`: `showModal` y `close` directamente no
 * existen, así que cualquier componente que los use explota con
 * "showModal is not a function". El polyfill hace lo mínimo para que el elemento
 * quede en el árbol de accesibilidad —poner y sacar el atributo `open`— sin
 * simular nada más.
 *
 * Va acá y no en el componente: `ConfirmDialog` usa `<dialog>` justamente porque
 * el navegador le da gratis la trampa de foco, el cierre con Escape y la inercia
 * del resto de la página. Meterle un camino alternativo para jsdom sería agregar
 * código de producción para el beneficio de los tests.
 */
if (typeof HTMLDialogElement !== 'undefined') {
  const proto = HTMLDialogElement.prototype;

  if (!proto.showModal) {
    proto.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
  }

  if (!proto.close) {
    proto.close = function close(this: HTMLDialogElement) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    };
  }
}

/**
 * jsdom no carga imágenes: `complete` queda en `false` para siempre. La
 * impresión de los reportes espera a que carguen las de la hoja (el logo), así
 * que sin esto cada test de "Exportar PDF" esperaría el tope de 3 s.
 */
if (typeof HTMLImageElement !== 'undefined') {
  Object.defineProperty(HTMLImageElement.prototype, 'complete', {
    configurable: true,
    get: () => true,
  });
}

/**
 * `usePublicConfig` (ENG-229) devuelve en todos los tests lo que responde hoy
 * `GET /config`: así ningún test depende de un request más, ni de cómo cada uno
 * simula `fetch`. `getPublicConfig` queda real y tiene su propio test.
 */
vi.mock('../shared/config/publicConfig', async (importOriginal) => {
  const { TEST_PUBLIC_CONFIG } = await import('../shared/config/testPublicConfig');
  return {
    ...(await importOriginal<typeof import('../shared/config/publicConfig')>()),
    usePublicConfig: () => TEST_PUBLIC_CONFIG,
  };
});
