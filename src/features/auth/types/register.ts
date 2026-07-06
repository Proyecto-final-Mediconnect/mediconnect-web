import { z } from 'zod';

/**
 * Validación del registro de paciente (ENG-42).
 * Espeja las reglas del backend: email válido, contraseña de al menos
 * 8 caracteres con una mayúscula y un número, y confirmación coincidente.
 */
export const registerPatientSchema = z
  .object({
    email: z.email('El email no tiene un formato válido'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'La contraseña debe incluir al menos una mayúscula')
      .regex(/[0-9]/, 'La contraseña debe incluir al menos un número'),
    passwordConfirmation: z.string().min(1, 'Confirmá la contraseña'),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'Las contraseñas no coinciden',
    path: ['passwordConfirmation'],
  });

export type RegisterPatientInput = z.infer<typeof registerPatientSchema>;

export type RegisterPatientResponse = {
  message: string;
};
