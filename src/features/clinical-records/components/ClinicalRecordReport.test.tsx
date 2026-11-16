// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { ClinicalRecordReport } from './ClinicalRecordReport';
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

afterEach(cleanup);

describe('ClinicalRecordReport', () => {
  it('arma la hoja en el body con el paciente, el resumen y cada registro con su vínculo', () => {
    render(
      <ClinicalRecordReport
        entries={[CORRECCION, ORIGINAL]}
        total={2}
        paciente="Julián Sosa"
        corregidaPor={new Map([['e1', 2]])}
        posicionDe={
          new Map([
            ['e1', 1],
            ['e2', 2],
          ])
        }
      />,
    );

    const hoja = document.querySelector('.hoja-reporte.hoja-historia');
    expect(hoja?.parentElement).toBe(document.body);
    expect(hoja).toHaveTextContent('Historia clínica');
    expect(hoja).toHaveTextContent('Julián Sosa');
    expect(hoja).toHaveTextContent('2 registros');
    expect(hoja).toHaveTextContent('Firmado por Lucas Ferreyra');
    expect(hoja).toHaveTextContent('ECG sin alteraciones agudas.');
    expect(hoja).toHaveTextContent(
      'Corrige el registro N.º 1, que se conserva sin cambios en este documento. Motivo: Se había transcripto mal la frecuencia.',
    );
    expect(hoja).toHaveTextContent('Tiene una corrección posterior (registro N.º 2)');
    expect(hoja).toHaveTextContent('Sello a3f9c1b2');
  });

  it('avisa cuando el documento sale con filtros', () => {
    render(
      <ClinicalRecordReport
        entries={[ORIGINAL]}
        total={5}
        corregidaPor={new Map()}
        posicionDe={new Map([['e1', 1]])}
      />,
    );

    expect(document.querySelector('.hoja-historia')).toHaveTextContent(
      '1 de 5 registros (con filtros)',
    );
  });
});
