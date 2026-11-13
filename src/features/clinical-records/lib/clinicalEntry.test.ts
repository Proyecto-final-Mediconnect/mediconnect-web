import { describe, expect, it } from 'vitest';
import { formatEntryDate, readEntry, readEntryFields, shortHash } from './clinicalEntry';
import type { ClinicalEntry } from '../types/clinicalRecord';

/**
 * Lectura del recurso FHIR guardado en `content` (ENG-58).
 *
 * Los casos raros no son hipotéticos: `content` es un JSONB que puede venir de
 * una versión anterior del mapeo o —cuando exista la importación desde otro
 * sistema— de otro emisor. Una historia clínica no puede quedar en pantalla
 * blanca porque a un recurso le falte un campo.
 */

function entry(content: unknown, fhirResourceType = 'ClinicalImpression'): ClinicalEntry {
  return {
    id: 'e1',
    patientId: 'p1',
    professionalId: 'q1',
    professional: null,
    sequenceNumber: 1,
    entryType: 'CONSULTA',
    fhirResourceType,
    content,
    consultationId: null,
    correctsEntryId: null,
    createdAt: '2026-08-27T12:00:00.000Z',
    contentHash: 'abcdef0123456789'.repeat(4),
    previousHash: '0'.repeat(64),
  };
}

const COMPLETO = {
  resourceType: 'ClinicalImpression',
  status: 'completed',
  description: 'Dolor lumbar de 3 días',
  summary: 'Buen estado general',
  finding: [{ item: { concept: { text: 'Lumbalgia mecánica' } } }],
  note: [{ text: 'Reposo relativo y control en 7 días' }],
};

describe('readEntry', () => {
  it('lee los cuatro campos de un recurso completo', () => {
    expect(readEntry(entry(COMPLETO))).toEqual({
      reason: 'Dolor lumbar de 3 días',
      findings: 'Buen estado general',
      diagnosis: 'Lumbalgia mecánica',
      plan: 'Reposo relativo y control en 7 días',
    });
  });

  it('devuelve null en los campos que no están', () => {
    const resource = { resourceType: 'ClinicalImpression', description: 'Control' };

    expect(readEntry(entry(resource))).toEqual({
      reason: 'Control',
      findings: null,
      diagnosis: null,
      plan: null,
    });
  });

  it('trata un string vacío como ausente', () => {
    expect(readEntry(entry({ description: '' })).reason).toBeNull();
  });

  it('no rompe con un content que no es un objeto', () => {
    // Un JSONB puede ser un string, un número o null.
    for (const roto of [null, 'texto suelto', 42, []]) {
      expect(() => readEntry(entry(roto))).not.toThrow();
      expect(readEntry(entry(roto)).reason).toBeNull();
    }
  });

  it('no rompe con listas vacías ni con formas inesperadas', () => {
    const raro = { description: 'ok', finding: [], note: [{}] };

    const readable = readEntry(entry(raro));

    expect(readable.reason).toBe('ok');
    expect(readable.diagnosis).toBeNull();
    expect(readable.plan).toBeNull();
  });

  it('no rompe si finding trae una estructura distinta', () => {
    const raro = { finding: [{ item: 'texto en vez de objeto' }] };

    expect(readEntry(entry(raro)).diagnosis).toBeNull();
  });
});

describe('readEntryFields', () => {
  it('prefiere el recurso que escribe la app', () => {
    const campos = readEntryFields(
      entry({ description: 'Motivo real', summary: 'Evolución', otra_clave: 'ruido' }),
    );

    // Reconoció el ClinicalImpression, así que no cae al respaldo y `otra_clave`
    // no se cuela como si fuera un campo clínico.
    expect(campos).toEqual([
      { label: 'Motivo', value: 'Motivo real' },
      { label: 'Evolución', value: 'Evolución' },
    ]);
  });

  it('cae a mostrar el contenido cuando el recurso es de otro tipo', () => {
    // Es lo que hay escrito en la base para las entradas DIAGNOSTICO. Postgres
    // devuelve las claves por longitud, así que el orden de entrada acá es el
    // que sale de la base — y la descripción tiene que quedar primera igual.
    const campos = readEntryFields(
      entry({ codigo: 'I10', estado: 'activo', sistema: 'ICD-10', descripcion: 'Hipertensión esencial' }, 'Condition'),
    );

    expect(campos).toEqual([
      { label: 'Descripción', value: 'Hipertensión esencial' },
      { label: 'Código', value: 'I10' },
      { label: 'Sistema', value: 'ICD-10' },
      { label: 'Estado', value: 'activo' },
    ]);
  });

  it('ordena por cómo se lee el recurso, no por cómo lo devuelve la base', () => {
    // Postgres ordena las claves por longitud: el medicamento salía último.
    const campos = readEntryFields(
      entry(
        { dosis: '10 mg', duracion: '30 días', frecuencia: 'cada 24 horas', medicamento: 'Enalapril' },
        'MedicationRequest',
      ),
    );

    expect(campos.map((c) => c.label)).toEqual(['Medicamento', 'Dosis', 'Frecuencia', 'Duración']);
  });

  it('no muestra el andamiaje del recurso como si fuera contenido', () => {
    const campos = readEntryFields(
      entry({ resourceType: 'Condition', status: 'completed', estudio: 'ECG' }),
    );

    expect(campos).toEqual([{ label: 'Estudio', value: 'ECG' }]);
  });

  it('con un content que no es objeto devuelve nada, sin romperse', () => {
    expect(readEntryFields(entry('texto suelto'))).toEqual([]);
  });
});

describe('formatEntryDate', () => {
  it('muestra fecha y hora', () => {
    const formatted = formatEntryDate('2026-08-27T12:34:00.000Z');

    expect(formatted).toMatch(/27 de agosto de 2026/);
    expect(formatted).toMatch(/\d{2}:\d{2}/);
  });
});

describe('shortHash', () => {
  it('recorta a 8 caracteres', () => {
    expect(shortHash('a'.repeat(64))).toBe('aaaaaaaa');
  });
});
