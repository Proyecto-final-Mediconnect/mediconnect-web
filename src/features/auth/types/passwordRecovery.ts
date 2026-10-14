import { z } from 'zod';
import { passwordField } from './register';

/** Pedir el enlace para elegir una contraseña nueva (ENG-142). */
export const forgotPasswordSchema = z.object({
  email: z.email('El email no tiene un formato válido'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/** La contraseña nueva, con las mismas reglas que el registro. */
export const resetPasswordSchema = z
  .object({
    password: passwordField,
    passwordConfirmation: z.string().min(1, 'Confirmá la contraseña'),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'Las contraseñas no coinciden',
    path: ['passwordConfirmation'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema> & {
  /** `token_hash` del enlace del mail: es lo que prueba que la persona
   *  controla el email de la cuenta. */
  tokenHash: string;
};

export type PasswordRecoveryResponse = { message: string };
