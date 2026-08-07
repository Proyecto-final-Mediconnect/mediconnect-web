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
 * Cuenta los decimales sobre la representación DECIMAL del número, igual que el
 * `maxDecimalPlaces` de class-validator en el backend. Con aritmética (`n * 100 % 1`)
 * el punto flotante rechazaría precios válidos: `0.07 * 100` da 7.000000000000001.
 * La notación exponencial (`1e-7`) no puede expresar centavos, así que se rechaza.
 */
function decimalPlaces(value: number): number {
  const text = String(value);
  if (text.includes('e') || text.includes('E')) return Infinity;
  return text.split('.')[1]?.length ?? 0;
}

/**
 * Validación del formulario de perfil público (ENG-48). Espeja las reglas del
 * backend: bio ≤ 500 caracteres, precio ≥ 0 con hasta 2 decimales, y hasta 3
 * especialidades. La foto se sube por separado (su propio endpoint), no entra acá.
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
    // El backend valida `maxDecimalPlaces: 2`. Sin esto, un 100.555 pasaba el front
    // y volvía como 400 desde la API.
    .refine((n) => decimalPlaces(n) <= 2, {
      message: 'El precio puede tener hasta 2 decimales',
    })
    .nullable(),
  specialtyIds: z
    .array(z.string())
    .max(3, 'Podés elegir hasta 3 especialidades'),
});

export type ProfessionalProfileInput = z.infer<
  typeof professionalProfileSchema
>;
