import { z } from 'zod';

/**
 * Validación del registro de profesional (ENG-43).
 * Espeja las reglas del backend: credenciales como el paciente + datos
 * profesionales (nombre, apellido, especialidad y número de matrícula).
 */
export const registerProfessionalSchema = z
  .object({
    email: z.email('El email no tiene un formato válido'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'La contraseña debe incluir al menos una mayúscula')
      .regex(/[0-9]/, 'La contraseña debe incluir al menos un número'),
    passwordConfirmation: z.string().min(1, 'Confirmá la contraseña'),
    firstName: z
      .string()
      .trim()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(60, 'El nombre es demasiado largo'),
    lastName: z
      .string()
      .trim()
      .min(2, 'El apellido debe tener al menos 2 caracteres')
      .max(60, 'El apellido es demasiado largo'),
    specialty: z
      .string()
      .trim()
      .min(2, 'Ingresá tu especialidad')
      .max(80, 'La especialidad es demasiado larga'),
    licenseNumber: z
      .string()
      .trim()
      .regex(
        /^[A-Za-z0-9./-]{3,20}$/,
        'El número de matrícula no tiene un formato válido',
      ),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: 'Las contraseñas no coinciden',
    path: ['passwordConfirmation'],
  });

export type RegisterProfessionalInput = z.infer<
  typeof registerProfessionalSchema
>;

export type RegisterProfessionalResponse = {
  message: string;
};
