import type { VitalAllergy, VitalCondition, VitalMedication } from '../types/patientProfile';
import { MAX_ROWS, type VitalForm } from './vitalInfo';

/**
 * El resumen de salud IPS de un documento, ordenado (ENG-246): lo que devuelve
 * `GET /patient-documents/:id/ips`. Las alergias, la medicación y las
 * condiciones vienen con el formato del MediPass, para poder sumarlas tal cual.
 */
export type IpsResumen = {
  documento: { titulo: string | null; fecha: string | null };
  propuesta: {
    allergies: VitalAllergy[];
    medications: VitalMedication[];
    conditions: VitalCondition[];
  };
  vacunas: { vacuna: string; fecha: string | null }[];
  /** Qué no se leyó del documento, en palabras. */
  ignorados: string[];
};

/** Lo que el paciente tildó para sumar a su MediPass. */
export type IpsSeleccion = IpsResumen['propuesta'];

const clave = (s: string) => s.trim().toLocaleLowerCase('es-AR');

/**
 * Suma lo elegido a lo que el paciente ya tenía: **no borra ni reemplaza nada**,
 * y lo que ya estaba (mismo nombre, sin importar mayúsculas) no se repite. Se
 * corta en el máximo de filas que acepta el backend.
 */
export function mergeIps(form: VitalForm, seleccion: IpsSeleccion): VitalForm {
  const sumar = <T>(actuales: T[], nuevos: T[], nombre: (t: T) => string): T[] => {
    const vistos = new Set(actuales.map((t) => clave(nombre(t))).filter(Boolean));
    const agregados = nuevos.filter((t) => {
      const k = clave(nombre(t));
      if (!k || vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });
    return [...actuales, ...agregados].slice(0, MAX_ROWS);
  };

  return {
    ...form,
    allergies: sumar(
      form.allergies,
      seleccion.allergies.map((a) => ({ que: a.que, gravedad: a.gravedad ?? '' })),
      (a) => a.que,
    ),
    medications: sumar(
      form.medications,
      seleccion.medications.map((m) => ({
        droga: m.droga,
        dosis: m.dosis ?? '',
        nota: m.nota ?? '',
      })),
      (m) => m.droga,
    ),
    conditions: sumar(
      form.conditions,
      seleccion.conditions.map((c) => ({ nombre: c.nombre, codigo: c.codigo ?? '' })),
      (c) => c.nombre,
    ),
  };
}

/** "26 de enero de 2018" a partir de una fecha del documento, o `null`. */
export function fechaDelDocumento(fecha: string | null): string | null {
  const dia = fecha?.slice(0, 10);
  if (!dia || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) return null;
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${dia}T00:00:00Z`));
}
