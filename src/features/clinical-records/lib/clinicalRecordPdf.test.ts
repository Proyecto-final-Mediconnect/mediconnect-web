import { describe, expect, it } from 'vitest';
import { clinicalRecordPdf } from './clinicalRecordPdf';
import { textoDe } from '../../../shared/lib/pdf/hoja';
import type { ClinicalEntry } from '../types/clinicalRecord';

const impresion = (motivo: string, extra: Record<string, unknown> = {}) => ({
  resourceType: 'ClinicalImpression',
  description: motivo,
  summary: 'Ritmo sinusal, FC 68 lpm.',
  finding: [{ item: { concept: { text: 'ECG sin alteraciones agudas.' } } }],
  note: [{ text: 'Repetir en 12 meses.' }],
  ...extra,
});

const base = {
  patientId: 'p',
  professionalId: 'l',
  professional: { firstName: 'Lucas', lastName: 'Ferreyra' },
  fhirResourceType: 'ClinicalImpression',
  consultationId: null,
  contentHash: 'a3f9c1b27d4e8f60',
  previousHash: '77ab12cd9e0f3b4a',
};

const ORIGINAL: ClinicalEntry = {
  ...base,
  id: 'e1',
  sequenceNumber: 1,
  entryType: 'ESTUDIO',
  content: impresion('Electrocardiograma de control.'),
  correctsEntryId: null,
  createdAt: '2026-09-20T13:00:00Z',
};

const CORRECCION: ClinicalEntry = {
  ...base,
  id: 'e2',
  sequenceNumber: 2,
  entryType: 'CORRECCION',
  content: impresion('Electrocardiograma de control.', {
    extension: [
      {
        url: 'urn:mediconnect:fhir:extension:correction-reason',
        valueString: 'Se había transcripto mal la frecuencia.',
      },
    ],
  }),
  correctsEntryId: 'e1',
  createdAt: '2026-09-21T10:00:00Z',
};

const posicionDe = new Map([
  ['e1', 1],
  ['e2', 2],
]);

function texto(doc: ReturnType<typeof clinicalRecordPdf>): string {
  return textoDe(doc.content);
}

describe('clinicalRecordPdf (ENG-231)', () => {
  it('lleva el paciente, el resumen y cada registro con su vínculo y su sello', () => {
    const doc = clinicalRecordPdf({
      entries: [CORRECCION, ORIGINAL],
      total: 2,
      paciente: 'Julián Sosa',
      corregidaPor: new Map([['e1', 2]]),
      posicionDe,
    });

    const t = texto(doc);
    expect(t).toContain('Historia clínica');
    expect(t).toContain('Julián Sosa');
    expect(t).toContain('2 registros');
    expect(t).toContain('Firmado por Lucas Ferreyra');
    expect(t).toContain('ECG sin alteraciones agudas.');
    expect(t).toContain(
      'Corrige el registro N.º 1, que se conserva sin cambios en este documento. Motivo: Se había transcripto mal la frecuencia.',
    );
    expect(t).toContain('Tiene una corrección posterior (registro N.º 2)');
    expect(t).toContain('Sello a3f9c1b2');
    expect(doc.info?.title).toBe('Historia clínica de Julián Sosa');
  });

  it('pone arriba el registro más nuevo aunque lleguen del más viejo al más nuevo', () => {
    const t = texto(
      clinicalRecordPdf({
        entries: [ORIGINAL, CORRECCION],
        total: 2,
        corregidaPor: new Map([['e1', 2]]),
        posicionDe,
      }),
    );

    expect(t.indexOf('Corrige el registro N.º 1')).toBeLessThan(
      t.indexOf('Tiene una corrección posterior'),
    );
  });

  it('avisa cuando el documento sale con filtros', () => {
    const t = texto(
      clinicalRecordPdf({
        entries: [ORIGINAL],
        total: 5,
        corregidaPor: new Map(),
        posicionDe,
      }),
    );

    expect(t).toContain('1 de 5 registros (con filtros)');
  });

  it('el resumen cuenta los tipos en singular o plural', () => {
    const otra = { ...ORIGINAL, id: 'e3', sequenceNumber: 3 };
    const t = texto(
      clinicalRecordPdf({
        entries: [ORIGINAL, otra, CORRECCION],
        total: 3,
        corregidaPor: new Map([['e1', 2]]),
        posicionDe,
      }),
    );

    expect(t).toContain('2 estudios · 1 corrección');
  });

  it('las fechas y horas son las de Argentina', () => {
    // 13:00 UTC del 20/9 son las 10:00 en Buenos Aires.
    const t = texto(
      clinicalRecordPdf({
        entries: [ORIGINAL],
        total: 1,
        corregidaPor: new Map(),
        posicionDe,
      }),
    );

    expect(t).toContain('10:00 h');
    expect(t).toContain('20 de septiembre de 2026');
  });
});
