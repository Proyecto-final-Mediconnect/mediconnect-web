import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';

/**
 * La subida de source maps a Sentry (ENG-98) solo corre cuando hay
 * `SENTRY_AUTH_TOKEN`, que existe únicamente en el build de producción (Render).
 *
 * En local y en CI no hay token: el plugin ni se carga, no se generan `.map` y
 * el build sigue igual que siempre. Es deliberado — el CI corre
 * `pnpm run build` como check en cada PR, y no puede romperse por una
 * credencial que no le corresponde tener.
 *
 * A diferencia del backend, acá las variables son de BUILD: se hornean en el
 * bundle al compilar. Como el build de producción lo hace Render (el workflow
 * de GitHub solo dispara el deploy hook), estas variables se configuran allá.
 */
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
const uploadSourceMaps = Boolean(sentryAuthToken);

export default defineConfig({
  build: {
    // `hidden` genera los .map pero omite el comentario `//# sourceMappingURL`
    // del bundle, así el navegador nunca los pide. Sentry los resuelve igual
    // por debug id, y el plugin los borra del output después de subirlos: no
    // quedan servidos públicamente.
    sourcemap: uploadSourceMaps ? 'hidden' : false,
  },
  plugins: [
    react(),
    tailwindcss(),
    ...(uploadSourceMaps
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: sentryAuthToken,
            release: { name: process.env.VITE_SENTRY_RELEASE },
            sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
          }),
        ]
      : []),
  ],
  test: {
    // `.env` no se versiona, así que en CI `VITE_API_BASE_URL` no existe y el
    // httpClient armaba URLs `undefined/...`. El base de los tests no apunta a
    // ningún servidor real (fetch está mockeado); solo tiene que ser una URL
    // absoluta válida para que los asserts puedan parsear el query string.
    env: { VITE_API_BASE_URL: 'http://localhost:3000' },
  },
});
