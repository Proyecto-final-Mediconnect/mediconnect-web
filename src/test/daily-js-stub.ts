/**
 * Reemplazo de `@daily-co/daily-js` en los tests (alias en `vite.config.ts`).
 *
 * El SDK real arma un iframe contra `daily.co` y habla por postMessage: en jsdom
 * no sirve. Este deja en el DOM un iframe con el `title` y el `src` que
 * produciría el Prebuilt, así los tests miran lo que ve el usuario. Los que
 * prueban las opciones de `createFrame` lo reemplazan con `vi.mock`.
 */
let current: { destroy: () => Promise<void> } | null = null;

const Daily = {
  getCallInstance: () => current,
  createFrame(parent: HTMLElement) {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('allow', 'camera; microphone; autoplay; display-capture');
    parent.appendChild(iframe);
    const frame = {
      iframe: () => iframe,
      join: async ({ url, token }: { url: string; token?: string }) => {
        iframe.src = token ? `${url}?t=${token}` : url;
      },
      destroy: async () => {
        iframe.remove();
        if (current === frame) current = null;
      },
    };
    current = frame;
    return frame;
  },
};

export default Daily;
