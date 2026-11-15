import { z } from 'zod';

/** Especialidad del catálogo curado (fuente única, ver ENG-48). */
export type Specialty = { id: string; name: string };

/** Un título de la formación, como lo devuelve y lo recibe el backend. */
export type Education = { institution: string; degree: string; year: number | null };

/** Un título mientras se edita: el año es texto (el campo) y `uid` es la key. */
export type EducationDraft = { uid: string; institution: string; degree: string; year: string };

/** Cuántos títulos acepta el backend. */
export const MAX_EDUCATION = 10;

/** El año más viejo que acepta el backend para un título. */
export const MIN_EDUCATION_YEAR = 1950;

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
  /** Opcional: un backend anterior a la edición de la formación no la manda. */
  education?: Education[];
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
  education: z
    .array(
      z.object({
        degree: z.string().trim().min(2, 'Falta el título').max(150, 'El título es demasiado largo'),
        institution: z
          .string()
          .trim()
          .min(2, 'Falta la institución')
          .max(150, 'El nombre de la institución es demasiado largo'),
        year: z
          .number()
          .int('El año tiene que ser un número entero')
          .min(MIN_EDUCATION_YEAR, `El año no puede ser anterior a ${MIN_EDUCATION_YEAR}`)
          .refine((y) => y <= new Date().getFullYear(), 'El año no puede ser futuro')
          .nullable(),
      }),
    )
    .max(MAX_EDUCATION, `Podés cargar hasta ${MAX_EDUCATION} títulos`)
    // Sin el campo, el backend no toca la formación; con una lista, la reemplaza.
    .optional(),
});

export type ProfessionalProfileInput = z.infer<
  typeof professionalProfileSchema
>;
