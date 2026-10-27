/**
 * Si en este navegador hubo sesión la última vez que se supo.
 *
 * Sirve para que la barra pública no espere a `GET /me` cuando el backend
 * arranca en frío (el plan free de Render tarda hasta un minuto): quien nunca
 * inició sesión ve "Ingresar" al instante, y quien sí la tenía ve el hueco
 * hasta que llega la respuesta, sin que se le diga por un momento que no tiene
 * sesión.
 *
 * Es solo una pista para dibujar: no guarda datos del usuario ni decide acceso.
 * Si el almacenamiento falla (navegación privada, bloqueado), se asume que no
 * hubo sesión.
 */
const CLAVE = 'mc:habia-sesion';

export function habiaSesion(): boolean {
  try {
    return localStorage.getItem(CLAVE) === '1';
  } catch {
    return false;
  }
}

export function recordarSesion(hay: boolean): void {
  try {
    if (hay) localStorage.setItem(CLAVE, '1');
    else localStorage.removeItem(CLAVE);
  } catch {
    // Sin almacenamiento: la próxima vez la barra muestra "Ingresar" mientras carga.
  }
}
