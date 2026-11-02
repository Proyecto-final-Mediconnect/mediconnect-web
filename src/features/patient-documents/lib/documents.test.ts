import { describe, expect, it } from 'vitest';
import { documentMeta, fileProblem, formatSize, suggestedTitle } from './documents';

const archivo = (name: string, type: string, size: number) =>
  new File([new Uint8Array(size)], name, { type });

describe('documentos (ENG-164)', () => {
  it('acepta PDF, JPG y PNG hasta 10 MB', () => {
    expect(fileProblem(archivo('a.pdf', 'application/pdf', 1000))).toBeNull();
    expect(fileProblem(archivo('a.jpg', 'image/jpeg', 1000))).toBeNull();
    expect(fileProblem(archivo('a.png', 'image/png', 1000))).toBeNull();
  });

  it('rechaza otros tipos, vacíos y los de más de 10 MB con el mensaje del backend', () => {
    expect(fileProblem(archivo('a.docx', 'application/msword', 10))).toBe(
      'Solo se pueden subir PDF, JPG o PNG.',
    );
    expect(fileProblem(archivo('a.pdf', 'application/pdf', 0))).toBe('El archivo está vacío.');
    expect(fileProblem(archivo('a.pdf', 'application/pdf', 10 * 1024 * 1024 + 1))).toBe(
      'El archivo no puede pasar los 10 MB.',
    );
  });

  it('sugiere el nombre del archivo sin extensión como título', () => {
    expect(suggestedTitle(archivo('hemograma_marzo-2026.pdf', 'application/pdf', 1))).toBe(
      'hemograma marzo 2026',
    );
  });

  it('arma el tamaño y la línea de datos salteando lo que falta', () => {
    expect(formatSize(2048)).toBe('2 KB');
    expect(formatSize(3.5 * 1024 * 1024)).toBe('3,5 MB');
    expect(
      documentMeta({
        id: '1',
        type: 'INFORME',
        title: 'x',
        documentDate: null,
        sourceInstitution: 'Hospital Privado',
        mimeType: 'application/pdf',
        sizeBytes: 1,
        uploadedAt: '',
      }),
    ).toBe('Informe · Hospital Privado');
  });
});
