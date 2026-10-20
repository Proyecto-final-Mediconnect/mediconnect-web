/**
 * Versión vigente de los textos legales de `/legales` (ENG-140).
 *
 * **Tiene que ser la misma que `LEGAL_VERSION` del backend**
 * (`src/legal/legal.ts`). Cuando cambian los textos, se suben las dos a la vez:
 * el backend rechaza una aceptación de otra versión, y a quien ya tenía cuenta se
 * le vuelven a pedir los textos nuevos al entrar.
 */
export const LEGAL_VERSION = '2026-10-13';

/** La misma fecha, para mostrar en pantalla. */
export const LEGAL_VERSION_LABEL = '13 de octubre de 2026';

/** Mismo texto que el 400 del backend: en el formulario y en la respuesta del
 *  servidor dice lo mismo. */
export const LEGAL_REQUIRED_MESSAGE =
  'Para usar MediConnect tenés que aceptar los términos y condiciones, la política de privacidad y el consentimiento para el tratamiento de tus datos de salud.';
