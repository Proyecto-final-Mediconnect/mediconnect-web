import type { VitalBlock } from '../types/medipass';

/**
 * Datos de ejemplo del MediPass para los tests. La web ya no muestra datos
 * inventados: el código y el bloque vital salen de la API (ENG-135).
 */

/**
 * El bloque vital.
 *
 * Coincide con la historia clínica de ejemplo del resto de la app —fibrilación
 * auricular, apixabán, alergia a la penicilina— para que las pantallas no se
 * contradigan entre sí. Va en inglés porque la tarjeta que lo muestra también:
 * quien la lee es un médico de guardia en el exterior.
 */
export const MOCK_VITAL_BLOCK: VitalBlock = {
  nombre: 'Marina Sosa',
  edad: 41,
  // En inglés, como la tarjeta que lo muestra: el caso de uso es una guardia en
  // el exterior y mezclar los dos idiomas en la misma línea ("Femenino · Blood
  // type") es exactamente donde se lee mal un dato que no se puede leer mal.
  sexo: 'Female',
  grupoSanguineo: '0 Rh+',
  pais: 'Argentina',
  alergias: [{ que: 'Penicillin', gravedad: 'anaphylaxis' }],
  medicacion: [
    { droga: 'Apixaban 5 mg', dosis: 'q12h', nota: 'Anticoagulated' },
    { droga: 'Enalapril 10 mg', dosis: 'q24h' },
  ],
  condiciones: [
    { nombre: 'Paroxysmal atrial fibrillation', codigo: 'ICD-10 I48' },
    { nombre: 'Essential hypertension', codigo: 'ICD-10 I10' },
  ],
  contacto: { nombre: 'Julián Sosa', vinculo: 'brother', telefono: '+54 351 555 2210' },
};
