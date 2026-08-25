import { z } from 'zod';

/** Perfil de paciente tal como lo devuelve el backend (GET /patients/me).
 *  `completed` es false hasta que el paciente carga sus datos por primera vez
 *  (la fila en `patients` nace recién ahí, no en el alta). */
export type PatientProfile = {
  profileId: string;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  dni: string | null;
  phone: string | null;
  completed: boolean;
};

/** Deja solo los dígitos de un DNI ("12.345.678" → "12345678"). */
export function normalizeDni(value: string): string {
  return value.replace(/\D/g, '');
}

// Hoy en formato AAAA-MM-DD, para acotar la fecha de nacimiento (no futura).
/** Hoy en formato AAAA-MM-DD. Se calcula en cada validación (no al cargar el
 *  módulo) para que una pestaña abierta cruzando la medianoche use la fecha real. */
const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Validación del formulario de perfil de paciente (ENG-47). Espeja exactamente
 * las reglas del backend: nombre/apellido obligatorios, DNI argentino de 7 u 8
 * dígitos, fecha de nacimiento no futura y teléfono plausible. Todos los campos
 * son requeridos: es "completar el perfil".
 */
export const patientProfileSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'El nombre es obligatorio')
    .max(80, 'El nombre no puede superar los 80 caracteres'),
  lastName: z
    .string()
    .trim()
    .min(1, 'El apellido es obligatorio')
    .max(80, 'El apellido no puede superar los 80 caracteres'),
  birthDate: z
    .string()
    .min(1, 'La fecha de nacimiento es obligatoria')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ingresá una fecha válida')
    .refine((d) => d <= todayIso(), 'La fecha de nacimiento no puede ser futura'),
  dni: z
    .string()
    .transform(normalizeDni)
    .pipe(z.string().regex(/^\d{7,8}$/, 'El DNI debe tener 7 u 8 dígitos (sin puntos ni letras)')),
  phone: z
    .string()
    .trim()
    .min(6, 'El teléfono es demasiado corto')
    .max(20, 'El teléfono es demasiado largo')
    .regex(/^\+?[\d\s-]{6,20}$/, 'El teléfono solo puede tener números, espacios, guiones y +'),
});

export type PatientProfileInput = z.infer<typeof patientProfileSchema>;
