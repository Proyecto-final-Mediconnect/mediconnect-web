import { z } from 'zod';

export const loginSchema = z.object({
  email: z.email('El email no tiene un formato válido'),
  password: z.string().min(1, 'Ingresá tu contraseña'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// La sesión viaja en cookies httpOnly seteadas por el backend; el cliente
// solo recibe los datos del usuario.
export type LoginResponse = {
  user: { id: string; email: string };
  /**
   * La cuenta tiene activa la verificación en dos pasos (ENG-88): la sesión
   * todavía no está abierta y falta el código de la app autenticadora.
   */
  mfaRequired?: boolean;
};
