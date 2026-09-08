import * as Sentry from '@sentry/react';
import type { ReactNode } from 'react';
import { Button } from './Button';

/**
 * Pantalla que se muestra cuando un error de render rompe el árbol.
 *
 * El mensaje es genérico a propósito: el detalle técnico va a Sentry, no a la
 * pantalla del usuario. Mostrar un stack trace no lo ayuda y puede exponer
 * rutas internas.
 */
function Fallback() {
  return (
    <div
      role="alert"
      className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <h1 className="text-2xl font-semibold text-brand-deep">Algo salió mal</h1>
      <p className="max-w-md text-sm text-muted">
        Ocurrió un error inesperado y no pudimos mostrar esta página. Ya fuimos notificados. Probá
        recargar; si sigue pasando, intentá más tarde.
      </p>
      <Button onClick={() => window.location.reload()}>Recargar la página</Button>
    </div>
  );
}

/**
 * Límite de error de la app (ENG-98).
 *
 * Antes de esto, cualquier excepción durante el render dejaba la pantalla en
 * blanco: el usuario no entendía qué había pasado y el equipo no se enteraba
 * nunca. Envuelve el árbol para mostrar una pantalla con sentido y reportar el
 * error a Sentry.
 *
 * Usa el boundary del SDK, que además de renderizar el fallback captura la
 * excepción con el component stack de React. Si Sentry no está inicializado
 * (sin DSN) sigue funcionando como límite de error normal, solo que sin
 * reportar.
 */
export function ErrorBoundary({ children }: { children: ReactNode }) {
  return <Sentry.ErrorBoundary fallback={<Fallback />}>{children}</Sentry.ErrorBoundary>;
}
