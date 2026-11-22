/** Roles de dominio de MediConnect. ADMINISTRADOR es el equipo de MediConnect,
 *  que administra a los profesionales (ENG-240): nadie se registra con ese rol. */
export type UserRole = 'PACIENTE' | 'PROFESIONAL' | 'ADMINISTRADOR';

/** Perfil del usuario autenticado, tal como lo devuelve `GET /me`.
 *  El `role` viene de `profiles.role` (base), no del JWT. */
export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string | null;
  lastName: string | null;
  /** Si aceptó la versión vigente de los textos legales (ENG-140). Opcional
   *  porque un backend anterior a ENG-140 no lo manda: en ese caso no se bloquea
   *  a nadie. Solo un `false` explícito muestra `LegalAcceptanceGate`. */
  legalAccepted?: boolean;
  legalVersion?: string;
}

/** Cómo se nombra cada rol en pantalla. Vive acá y no en el menú porque ahora lo
 *  usan dos barras distintas —la de la app y la pública— y duplicarlo garantiza
 *  que un día digan cosas diferentes. */
export const ROLE_LABEL: Record<UserRole, string> = {
  PACIENTE: 'Paciente',
  PROFESIONAL: 'Profesional',
  ADMINISTRADOR: 'Administrador',
};

/** Iniciales para el avatar. Cae al email cuando el perfil todavía no tiene
 *  nombre —pasa entre el registro y el alta de la ficha— y a un punto cuando no
 *  hay ni eso, para que el círculo nunca quede vacío. */
export function initialsOf(user: SessionUser): string {
  const deNombre = (user.firstName?.charAt(0) ?? '') + (user.lastName?.charAt(0) ?? '');
  return (deNombre || user.email.charAt(0) || '·').toUpperCase();
}

/** Nombre completo, con el email como respaldo por el mismo motivo. */
export function displayNameOf(user: SessionUser): string {
  return user.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : user.email;
}

/** Ruta del dashboard correspondiente a cada rol (ENG-44). */
export const DASHBOARD_BY_ROLE: Record<UserRole, string> = {
  PACIENTE: '/paciente',
  PROFESIONAL: '/profesional',
  ADMINISTRADOR: '/admin',
};

/** `GET /me` puede devolver un rol que esta versión de la web no conoce (por
 *  ejemplo, MODERADOR con un backend anterior a ENG-240). Sin esto, ni el menú
 *  ni los guards saben qué hacer. */
export function isKnownRole(role: string | undefined): role is UserRole {
  return role !== undefined && Object.prototype.hasOwnProperty.call(DASHBOARD_BY_ROLE, role);
}

/** Nombre en pantalla de un rol, con respaldo para uno desconocido. */
export function roleLabelOf(role: string): string {
  return isKnownRole(role) ? ROLE_LABEL[role] : 'Usuario';
}

export function dashboardPathFor(role: UserRole): string {
  return DASHBOARD_BY_ROLE[role] ?? '/';
}
