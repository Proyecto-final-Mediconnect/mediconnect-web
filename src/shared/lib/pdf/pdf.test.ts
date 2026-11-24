import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { crearPdf, LOGO_URL } from './pdf';
import { activityPdf } from '../../../features/activity/lib/activityPdf';
import { summaryPdf } from '../../../features/patient-summary/summaryPdf';
import { receiptPdf } from '../../../features/payments/lib/receiptPdf';
import { clinicalRecordPdf } from '../../../features/clinical-records/lib/clinicalRecordPdf';
import { emergencyCardPdf } from '../../../features/medipass/lib/emergencyCardPdf';
import type { Appointment } from '../../../features/appointments/types/appointment';
import type { ClinicalEntry } from '../../../features/clinical-records/types/clinicalRecord';
import type { PaymentReceipt } from '../../../features/payments/types/payment';

/**
 * Los cinco PDF de la web armados de verdad con pdfmake (ENG-231): una
 * definición mal formada recién falla al generar, y estos tests lo agarran.
 *
 * Las fuentes son las reales (las mismas WOFF que baja el navegador). El logo
 * va como un JPEG chico: el PNG del logo se descomprime con un Worker, que el
 * navegador tiene y el entorno de tests no.
 */

const JPEG_1X2 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDz2iiivXPnz//Z';

async function leer(url: string): Promise<ArrayBuffer> {
  const datos =
    url === LOGO_URL
      ? Buffer.from(JPEG_1X2, 'base64')
      : await readFile(path.resolve(`.${url.split('?')[0]}`));
  return datos.buffer.slice(datos.byteOffset, datos.byteOffset + datos.byteLength) as ArrayBuffer;
}

async function generar(doc: TDocumentDefinitions): Promise<string> {
  const buffer = await (await crearPdf(doc, leer)).getBuffer();
  return Buffer.from(buffer).toString('latin1');
}

/** Cuántas páginas tiene el PDF (`/Type /Page`, sin contar `/Pages`). */
function paginas(pdf: string): number {
  return (pdf.match(/\/Type \/Page\b/g) ?? []).length;
}

const AHORA = new Date('2026-11-24T13:15:00Z');

const entrada = (i: number, extra: Partial<ClinicalEntry> = {}): ClinicalEntry => ({
  id: `e${i}`,
  patientId: 'p',
  professionalId: 'l',
  professional: { firstName: 'Lucas', lastName: 'Ferreyra' },
  sequenceNumber: i,
  entryType: 'CONSULTA',
  fhirResourceType: 'ClinicalImpression',
  content: {
    resourceType: 'ClinicalImpression',
    description: `Control número ${i}. ${'Refiere cansancio y palpitaciones ocasionales. '.repeat(4)}`,
    note: [{ text: 'Repetir en 12 meses.' }],
  },
  consultationId: null,
  correctsEntryId: null,
  createdAt: `2026-0${(i % 9) + 1}-10T13:00:00Z`,
  contentHash: 'a3f9c1b27d4e8f60'.repeat(4),
  previousHash: '77ab12cd9e0f3b4a'.repeat(4),
  ...extra,
});

describe('los PDF se generan (ENG-231)', () => {
  it('Mi actividad, con los doce meses', async () => {
    const pdf = await generar(
      activityPdf({
        periodo: 'Últimos 12 meses',
        persona: 'Ana García',
        ahora: AHORA,
        datos: {
          from: '2025-12-01',
          to: '2026-11-30',
          turnos: { completados: 21, noAsistio: 2, cancelados: 2, liberados: 1, porVenir: 4 },
          tasas: {
            cancelacion: { porcentaje: 8, numerador: 2, denominador: 25 },
            ausentismo: null,
          },
          consultasPorMes: Array.from({ length: 12 }, (_, i) => ({
            mes: `2026-${String(i + 1).padStart(2, '0')}`,
            consultas: i % 4 === 0 ? 0 : i,
          })),
          pacientes: { unicos: 15, recurrentes: 4 },
          resenas: { promedio: null, cantidad: 0, sinResponder: 0 },
          incidencias: { cancelaciones: 1, ausencias: 0, fallasTecnicas: 1 },
        },
      }),
    );
    expect(pdf.startsWith('%PDF-')).toBe(true);
    expect(paginas(pdf)).toBe(1);
  });

  it('Tu resumen', async () => {
    const pdf = await generar(
      summaryPdf({
        periodo: 'Últimos 30 días',
        ahora: AHORA,
        datos: {
          from: '2026-10-25',
          to: '2026-11-24',
          currency: 'ARS',
          consultas: { realizadas: 3, profesionales: 2 },
          pagos: { pagado: 54000, reembolsado: 9000, neto: 45000, turnos: 4, porVenir: 1 },
          accesos: { medipass: 2, historiaClinica: 3, total: 5 },
        },
      }),
    );
    expect(paginas(pdf)).toBe(1);
  });

  it('el comprobante de pago', async () => {
    const pdf = await generar(
      receiptPdf({
        ahora: AHORA,
        confirmedAt: '2026-11-15T15:00:00Z',
        receipt: {
          amount: 18000,
          currency: 'ARS',
          method: 'credit_card',
          operationId: '123456789',
        } as PaymentReceipt,
        appointment: {
          date: '2026-11-20',
          startTime: '10:30',
          durationMinutes: 30,
          professional: { id: 'p1', firstName: 'Ana', lastName: 'García' },
          patient: { id: 'u1', firstName: 'Juan', lastName: 'Pérez' },
        } as Appointment,
      }),
    );
    expect(paginas(pdf)).toBe(1);
  });

  it('una historia clínica larga ocupa varias hojas', async () => {
    const entries = Array.from({ length: 14 }, (_, i) => entrada(i + 1));
    entries.push(entrada(15, { entryType: 'CORRECCION', correctsEntryId: 'e14' }));
    const pdf = await generar(
      clinicalRecordPdf({
        entries,
        total: 15,
        paciente: 'Julián Sosa',
        corregidaPor: new Map([['e14', 15]]),
        posicionDe: new Map(entries.map((e) => [e.id, e.sequenceNumber])),
        ahora: AHORA,
      }),
    );
    expect(paginas(pdf)).toBeGreaterThan(1);
  });

  it('una historia clínica vacía también se genera', async () => {
    const pdf = await generar(
      clinicalRecordPdf({
        entries: [],
        total: 0,
        corregidaPor: new Map(),
        posicionDe: new Map(),
        ahora: AHORA,
      }),
    );
    expect(paginas(pdf)).toBe(1);
  });

  it('la tarjeta de emergencia, con su QR, entra en una hoja', async () => {
    const pdf = await generar(
      emergencyCardPdf({
        url: 'https://mediconnect.test/medipass/emergencia#tarjeta=Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3_-Ab3',
        nombre: 'Marina Ocampo',
        sessionMinutes: 30,
        ahora: AHORA,
      }),
    );
    expect(paginas(pdf)).toBe(1);
  });
});
