import type { Specialty } from '../types/catalog';

/**
 * Especialidades sin repetidos, en el orden en que llegan.
 *
 * Se compara por id y también por nombre normalizado: el join con la tabla de
 * especialidades puede traer la misma dos veces, y una carga vieja puede tener
 * "Cardiología" y "cardiologia" como filas distintas. En pantalla son la misma, y
 * mostrarlas dos veces se ve como un error.
 *
 * `primeraId`, si viene, se pone adelante: es la principal y es la que se
 * destaca.
 */
export function uniqueSpecialties(specialties: Specialty[], primeraId?: string): Specialty[] {
  const vistos = new Set<string>();
  const unicas: Specialty[] = [];

  for (const specialty of specialties) {
    const nombre = normalizar(specialty.name);
    if (nombre === '' || vistos.has(specialty.id) || vistos.has(nombre)) continue;
    vistos.add(specialty.id);
    vistos.add(nombre);
    unicas.push({ ...specialty, name: specialty.name.trim() });
  }

  const i = primeraId ? unicas.findIndex((s) => s.id === primeraId) : -1;
  if (i > 0) unicas.unshift(...unicas.splice(i, 1));
  return unicas;
}

/** Minúsculas, sin tildes ni espacios de más. */
function normalizar(nombre: string): string {
  return nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
}
