import type { PatientProfile, VitalInfoInput } from '../types/patientProfile';

/**
 * El formulario de datos vitales (ENG-136), sin React: pasar del perfil a lo que
 * se edita, y de lo editado a lo que se manda, con las mismas reglas que valida
 * el backend (`UpdateVitalInfoDto`).
 */

export type AllergyRow = { que: string; gravedad: string };
export type MedicationRow = { droga: string; dosis: string; nota: string };
export type ConditionRow = { nombre: string; codigo: string };

export type VitalForm = {
  sex: string;
  bloodType: string;
  allergies: AllergyRow[];
  medications: MedicationRow[];
  conditions: ConditionRow[];
  contact: { nombre: string; vinculo: string; telefono: string };
};

export const EMPTY_ALLERGY: AllergyRow = { que: '', gravedad: '' };
export const EMPTY_MEDICATION: MedicationRow = { droga: '', dosis: '', nota: '' };
export const EMPTY_CONDITION: ConditionRow = { nombre: '', codigo: '' };

/** Lo que el backend acepta por lista: más que eso no entra en una ficha de guardia. */
export const MAX_ROWS = 30;

const TELEFONO = /^\+?[\d\s-]{6,20}$/;

export function toForm(profile: PatientProfile | undefined): VitalForm {
  return {
    sex: profile?.sex ?? '',
    bloodType: profile?.bloodType ?? '',
    allergies: (profile?.allergies ?? []).map((a) => ({ que: a.que, gravedad: a.gravedad ?? '' })),
    medications: (profile?.medications ?? []).map((m) => ({
      droga: m.droga,
      dosis: m.dosis ?? '',
      nota: m.nota ?? '',
    })),
    conditions: (profile?.conditions ?? []).map((c) => ({
      nombre: c.nombre,
      codigo: c.codigo ?? '',
    })),
    contact: {
      nombre: profile?.emergencyContact?.nombre ?? '',
      vinculo: profile?.emergencyContact?.vinculo ?? '',
      telefono: profile?.emergencyContact?.telefono ?? '',
    },
  };
}

/** Un texto recortado, o nada si quedó vacío (el backend no quiere `""`). */
const opcional = (texto: string) => texto.trim() || undefined;
const vacia = (fila: Record<string, string>) => Object.values(fila).every((v) => !v.trim());

/**
 * Lo editado a lo que se manda. Las filas que quedaron vacías se descartan (es
 * lo que pasa al tocar "Agregar" y no escribir nada). Los errores van por
 * campo, con la misma clave que el input: `allergies.0.que`, `contact.telefono`.
 */
export function toInput(form: VitalForm): {
  input: VitalInfoInput;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  const allergies = form.allergies.flatMap((a, i) => {
    if (vacia(a)) return [];
    if (!a.que.trim()) errors[`allergies.${i}.que`] = 'Decí a qué sos alérgico';
    return [{ que: a.que.trim(), gravedad: opcional(a.gravedad) }];
  });

  const medications = form.medications.flatMap((m, i) => {
    if (vacia(m)) return [];
    if (!m.droga.trim()) errors[`medications.${i}.droga`] = 'Falta el nombre del remedio';
    return [{ droga: m.droga.trim(), dosis: opcional(m.dosis), nota: opcional(m.nota) }];
  });

  const conditions = form.conditions.flatMap((c, i) => {
    if (vacia(c)) return [];
    if (!c.nombre.trim()) errors[`conditions.${i}.nombre`] = 'Falta el nombre de la condición';
    return [{ nombre: c.nombre.trim(), codigo: opcional(c.codigo) }];
  });

  let emergencyContact: VitalInfoInput['emergencyContact'];
  if (!vacia(form.contact)) {
    if (!form.contact.nombre.trim()) errors['contact.nombre'] = 'Falta el nombre del contacto';
    if (!form.contact.telefono.trim()) errors['contact.telefono'] = 'Falta el teléfono';
    else if (!TELEFONO.test(form.contact.telefono.trim()))
      errors['contact.telefono'] = 'Solo números, espacios, guiones y +';
    emergencyContact = {
      nombre: form.contact.nombre.trim(),
      vinculo: opcional(form.contact.vinculo),
      telefono: form.contact.telefono.trim(),
    };
  }

  return {
    input: {
      sex: opcional(form.sex),
      bloodType: opcional(form.bloodType),
      allergies: allergies.length ? allergies : undefined,
      medications: medications.length ? medications : undefined,
      conditions: conditions.length ? conditions : undefined,
      emergencyContact,
    },
    errors,
  };
}

/** Si el paciente no cargó nada todavía: el MediPass sale vacío. */
export function isEmpty(form: VitalForm): boolean {
  const { input } = toInput(form);
  return Object.values(input).every((v) => v === undefined);
}
