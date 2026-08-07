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

/** Ruta del dashboard correspondiente a cada rol (ENG-44). */
export const DASHBOARD_BY_ROLE: Record<UserRole, string> = {
  PACIENTE: '/paciente',
  PROFESIONAL: '/profesional',
  MODERADOR: '/moderacion',
};

export function dashboardPathFor(role: UserRole): string {
  return DASHBOARD_BY_ROLE[role] ?? '/';
}
