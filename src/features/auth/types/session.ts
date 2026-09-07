/** Roles de dominio de MediConnect (espeja `user_role` de la base). */
export type UserRole = 'PACIENTE' | 'PROFESIONAL' | 'MODERADOR';

/** Perfil del usuario autenticado, tal como lo devuelve `GET /me`.
 *  El `role` viene de `profiles.role` (base), no del JWT. */
export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string | null;
  lastName: string | null;
}

/** Cómo se nombra cada rol en pantalla. Vive acá y no en el menú porque ahora lo
 *  usan dos barras distintas —la de la app y la pública— y duplicarlo garantiza
 *  que un día digan cosas diferentes. */
export const ROLE_LABEL: Record<UserRole, string> = {
  PACIENTE: 'Paciente',
  PROFESIONAL: 'Profesional',
  MODERADOR: 'Moderador',
};

/** Iniciales para el avatar. Cae al email cuando el perfil todavía no tiene
 *  nombre —pasa entre el registro y el alta de la ficha— y a un punto cuando no
 *  hay ni eso, para que el círculo nunca quede vacío. */
export function initialsOf(user: SessionUser): string {
  const deNombre =
    (user.firstName?.charAt(0) ?? '') + (user.lastName?.charAt(0) ?? '');
  return (deNombre || user.email.charAt(0) || '·').toUpperCase();
}

/** Nombre completo, con el email como respaldo por el mismo motivo. */
export function displayNameOf(user: SessionUser): string {
  return user.firstName
    ? `${user.firstName} ${user.lastName ?? ''}`.trim()
    : user.email;
}

/** Ruta del dashboard correspondiente a cada rol (ENG-44). */
export const DASHBOARD_BY_ROLE: Record<UserRole, string> = {
  PACIENTE: '/paciente',
  PROFESIONAL: '/profesional',
  MODERADOR: '/moderacion',
};

export function dashboardPathFor(role: UserRole): string {
  return DASHBOARD_BY_ROLE[role] ?? '/';
}
