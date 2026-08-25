import * as Sentry from '@sentry/react';
import { scrubBreadcrumb, scrubEvent } from './shared/lib/sentry.scrubbing';

/**
 * Inicialización de Sentry (ENG-83 / ENG-98).
 *
 * Se importa como PRIMERA línea de `main.tsx`, antes del `createRoot`, para que
 * también se capturen los errores que ocurren durante el arranque de la app.
 *
 * Sin `VITE_SENTRY_DSN` el SDK queda inactivo y no envía nada: es lo que se
 * espera en local y en CI, así no se ensucia el dashboard con errores de
 * desarrollo.
 *
 * A diferencia del backend, acá las variables son de BUILD: Vite las hornea en
 * el bundle al compilar. Como el build de producción lo hace Render, el DSN se
 * configura allá y cambiarlo exige recompilar.
 *
 * El DSN no es un secreto: es público por diseño y solo habilita el envío de
 * eventos. El token de subida de source maps sí lo es, vive en la config de
 * Vite y nunca llega al cliente.
 */
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,

  environment: import.meta.env.VITE_SENTRY_ENVIRONMENT ?? import.meta.env.MODE,

  // Debe coincidir con el `release` con el que se suben los source maps en
  // `vite.config.ts`, o los stack traces no se resuelven.
  release: import.meta.env.VITE_SENTRY_RELEASE,

  // No adjuntar IP ni datos de usuario automáticamente: son datos personales y
  // acá se trata con pacientes (Ley 25.326).
  sendDefaultPii: false,

  // Tracing desactivado: este ticket entrega monitoreo de errores. Habilitarlo
  // implica muestrear navegación y requests hacia un tercero.
  tracesSampleRate: 0,

  // Session Replay NO se habilita (decisión de ENG-83): graba el DOM del
  // usuario, y en las pantallas de historia clínica equivaldría a filmar datos
  // clínicos. No viene en las integraciones por defecto, así que alcanza con no
  // agregarlo — pero se deja asentado para que nadie lo sume sin discutirlo.
  beforeSend: (event) => scrubEvent(event),
  beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
});
