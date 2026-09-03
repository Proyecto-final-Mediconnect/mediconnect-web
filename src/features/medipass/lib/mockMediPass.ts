import type {
  EmergencyScopeOption,
  MediPassAccess,
  VitalBlock,
} from '../types/medipass';

/**
 * ⚠️ DATOS INVENTADOS — no salen de la API.
 *
 * **Las tablas del MediPass YA EXISTEN**: `medipass_codes`, `medipass_sessions`
 * y `medipass_access_logs`, con las columnas que esta pantalla necesita —código
 * con vencimiento, sesión con consultante, matrícula, expiración y revocación, y
 * bitácora de accesos—. Lo que falta es el service y el controller: no hay una
 * sola ruta HTTP. Es la misma situación que la historia clínica, no una peor.
 *
 * Lo que sí falta del todo: la mayoría de lo que muestra el bloque vital **no tiene dónde guardarse
 * hoy**. El perfil de paciente son cinco campos (nombre, apellido, fecha de
 * nacimiento, DNI y teléfono): no hay grupo sanguíneo, ni alergias, ni contacto
 * de emergencia. Eso es un formulario que nadie escribió todavía.
 *
 * LO QUE HARÍA FALTA DEL BACKEND
 *   GET  /medipass/me                       → código vigente y su rotación (ENG-72)
 *   GET  /medipass/me/vital                 → el bloque vital
 *   GET  /medipass/me/accesses              → quién está mirando (ENG-74, ENG-76)
 *   DELETE /medipass/me/accesses/:id        → revocar (ENG-75)
 *   PUT  /medipass/me/scope                 → qué se ve en una emergencia
 *   POST /medipass/sessions                 → entrar con un código (ENG-73)
 *
 * Y campos nuevos en `patients`, que hoy tiene cinco (nombre, apellido, fecha de
 * nacimiento, DNI y teléfono) más `address`, que ningún flujo escribe: faltan
 * grupo sanguíneo, alergias, medicación crónica y contacto de emergencia.
 */

/**
 * El código del pasaporte.
 *
 * En el canvas es fijo; acá se muestra con su cuenta regresiva porque ENG-72 pide
 * que rote cada 5 minutos. El sufijo cambia con la ventana para que se vea que
 * rota: es teatro, pero teatro del comportamiento correcto.
 */
export const MEDIPASS_PREFIJO = 'MP-AR-8F42';

/** Emisión del pasaporte, para el pie del código. */
export const MEDIPASS_EMITIDO = 'marzo de 2026';

/**
 * Los cuatro bloques que el paciente puede prender o apagar.
 *
 * Van de lo que salva una vida a lo que es privacidad pura, y en ese orden: el
 * primero es fijo porque sin alergias ni medicación el MediPass no sirve para lo
 * único que no puede fallar.
 */
export const EMERGENCY_SCOPES: EmergencyScopeOption[] = [
  {
    id: 'VITAL',
    label: 'Alergias, medicación y grupo sanguíneo',
    detalle: 'Lo que un médico de guardia necesita antes de indicarte nada.',
    fijo: true,
  },
  {
    id: 'CONDICIONES',
    label: 'Condiciones crónicas y cirugías',
    detalle: 'Diagnósticos activos y antecedentes quirúrgicos.',
  },
  {
    id: 'NOTAS',
    label: 'Notas completas de las consultas',
    detalle: 'Todo lo que escribieron tus profesionales, tal cual lo escribieron.',
  },
  {
    id: 'ESTUDIOS',
    label: 'Estudios adjuntos e imágenes',
    detalle: 'Laboratorios, informes y las imágenes que tengas cargadas.',
  },
];

/** Accesos de ejemplo. El segundo está por vencer, para ver los dos estados. */
export function mockAccesses(now: Date = new Date()): MediPassAccess[] {
  return [
    {
      id: 'acc-1',
      quien: 'Dra. Valeria Ocampo',
      contexto: 'Cardiología · videoconsulta del 3 de septiembre',
      desde: new Date(now.getTime() - 6 * 60_000).toISOString(),
      expiraEl: new Date(now.getTime() + 24 * 60_000).toISOString(),
      alcance: ['VITAL', 'CONDICIONES', 'NOTAS'],
      revocadoEl: null,
    },
    {
      id: 'acc-2',
      quien: 'Guardia · Hospital Italiano',
      contexto: 'Consultante externo, entró con tu código',
      desde: new Date(now.getTime() - 27 * 60_000).toISOString(),
      expiraEl: new Date(now.getTime() + 3 * 60_000).toISOString(),
      matricula: 'MN 98211',
      alcance: ['VITAL'],
      revocadoEl: null,
    },
  ];
}

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
