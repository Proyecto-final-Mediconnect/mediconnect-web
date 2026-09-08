import { describe, expect, it } from 'vitest';
import { formatEntryDate, readEntry, shortHash } from './clinicalEntry';
import type { ClinicalEntry } from '../types/clinicalRecord';

/**
 * Lectura del recurso FHIR guardado en `content` (ENG-58).
 *
 * Los casos raros no son hipotéticos: `content` es un JSONB que puede venir de
 * una versión anterior del mapeo o —cuando exista la importación desde otro
 * sistema— de otro emisor. Una historia clínica no puede quedar en pantalla
 * blanca porque a un recurso le falte un campo.
 */

function entry(content: unknown): ClinicalEntry {
  return {
    id: 'e1',
    patientId: 'p1',
    professionalId: 'q1',
    sequenceNumber: 1,
    entryType: 'CONSULTA',
    fhirResourceType: 'ClinicalImpression',
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

describe('formatEntryDate', () => {
  it('muestra fecha y hora', () => {
    const formatted = formatEntryDate('2026-08-27T12:34:00.000Z');

    expect(formatted).toMatch(/27\/08\/2026/);
    expect(formatted).toMatch(/\d{2}:\d{2}/);
  });
});

describe('shortHash', () => {
  it('recorta a 8 caracteres', () => {
    expect(shortHash('a'.repeat(64))).toBe('aaaaaaaa');
  });
});
