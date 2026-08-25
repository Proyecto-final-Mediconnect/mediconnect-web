import type { Breadcrumb, ErrorEvent } from '@sentry/react';

/**
 * Saneamiento de los eventos que se envían a Sentry (ENG-83 / ENG-98).
 *
 * Sentry es un servicio de terceros: todo lo que se adjunte a un evento sale de
 * nuestra infraestructura. MediConnect maneja historia clínica (Ley 26.529) y
 * datos de salud, que la Ley 25.326 trata como dato sensible.
 *
 * Espeja la política que ya aplica el backend: no se reporta body, headers,
 * cookies ni query string, y al usuario se lo identifica por su id (el `sub`
 * del JWT), nunca por su email.
 *
 * En el browser hay dos fuentes propias que no existen del lado del servidor:
 *
 * - `httpContextIntegration` (activa por defecto) adjunta la URL de la página y
 *   headers como `Referer`, que puede arrastrar la ruta anterior con ids.
 * - `breadcrumbsIntegration` (activa por defecto) registra cada fetch/XHR con su
 *   URL completa, y esas rutas llevan ids de paciente.
 */

/**
 * Quita del evento todo lo que pueda contener datos sensibles antes de enviarlo.
 *
 * Del request se conserva solo la ruta de la página, sin query string: alcanza
 * para ubicar dónde falló y no revela datos del paciente.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    const { url } = event.request;

    // `headers` se descarta entero: `Referer` puede traer la ruta previa con
    // ids, y `User-Agent` no aporta nada que Sentry no infiera solo.
    event.request = {
      ...(url !== undefined && { url: url.split('?')[0] }),
    };
  }

  // Sin `sendDefaultPii` el SDK no adjunta datos del usuario, pero el id puede
  // llegar por `Sentry.setUser`. Nos quedamos solo con el id: `SessionUser`
  // incluye email, nombre y apellido, y ninguno debe salir.
  if (event.user) {
    const { id } = event.user;

    event.user = id !== undefined ? { id } : {};
  }

  return event;
}

/**
 * Recorta el payload de los breadcrumbs.
 *
 * A diferencia del backend, acá no se borra `data` entero: en el browser los
 * breadcrumbs de red son la principal ayuda para reconstruir qué pasó antes del
 * error. Se conservan método y código de estado —"un POST devolvió 500"— y se
 * descarta la URL, que es la que puede llevar ids de paciente o códigos
 * MediPass.
 */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  if (!breadcrumb.data) {
    return breadcrumb;
  }

  const { method, status_code } = breadcrumb.data as {
    method?: unknown;
    status_code?: unknown;
  };

  breadcrumb.data = {
    ...(method !== undefined && { method }),
    ...(status_code !== undefined && { status_code }),
  };

  return breadcrumb;
}
