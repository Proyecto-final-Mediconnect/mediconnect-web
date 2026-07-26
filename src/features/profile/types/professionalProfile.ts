import { z } from 'zod';

/** Especialidad del catálogo curado (fuente única, ver ENG-48). */
export type Specialty = { id: string; name: string };

/** Perfil profesional tal como lo devuelve el backend (GET /professionals/me). */
export type ProfessionalProfile = {
  profileId: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  bio: string | null;
  photoUrl: string | null;
  consultationPrice: number | null;
  currency: string;
  status: string;
  specialties: Specialty[];
};

/**
 * Validación del formulario de perfil público (ENG-48). Espeja las reglas del
 * backend: bio ≤ 500 caracteres, precio ≥ 0 y hasta 3 especialidades. La foto
 * se sube por separado (su propio endpoint), no entra en este schema.
 */
export const professionalProfileSchema = z.object({
  bio: z
    .string()
    .trim()
    .max(500, 'La bio no puede superar los 500 caracteres'),
  consultationPrice: z
    .number()
    .min(0, 'El precio no puede ser negativo')
    .max(99_999_999, 'El precio es demasiado alto')
    .nullable(),
  specialtyIds: z
    .array(z.string())
    .max(3, 'Podés elegir hasta 3 especialidades'),
});

export type ProfessionalProfileInput = z.infer<
  typeof professionalProfileSchema
>;
