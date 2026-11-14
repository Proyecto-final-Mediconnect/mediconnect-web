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
 * contradigan entre sí. Va en español, como la tarjeta que lo muestra.
 */
export const MOCK_VITAL_BLOCK: VitalBlock = {
  nombre: 'Marina Sosa',
  edad: 41,
  sexo: 'Femenino',
  grupoSanguineo: '0 Rh+',
  pais: 'Argentina',
  alergias: [{ que: 'Penicilina', gravedad: 'anafilaxia' }],
  medicacion: [
    { droga: 'Apixabán 5 mg', dosis: 'q12h', nota: 'Anticoagulada' },
    { droga: 'Enalapril 10 mg', dosis: 'q24h' },
  ],
  condiciones: [
    { nombre: 'Fibrilación auricular paroxística', codigo: 'CIE-10 I48' },
    { nombre: 'Hipertensión esencial', codigo: 'CIE-10 I10' },
  ],
  contacto: { nombre: 'Julián Sosa', vinculo: 'hermano', telefono: '+54 351 555 2210' },
};
