import { describe, expect, it } from 'vitest';
import { attachmentProblem, formatSize, messagePreview } from './attachments';

/** Archivos en el chat (ENG-102): lo que se avisa antes de subir. */
describe('attachments', () => {
  it('acepta PDF, JPG y PNG de hasta 10 MB', () => {
    expect(attachmentProblem({ type: 'application/pdf', size: 1024 })).toBeNull();
    expect(attachmentProblem({ type: 'image/jpeg', size: 10 * 1024 * 1024 })).toBeNull();
    expect(attachmentProblem({ type: 'image/png', size: 1 })).toBeNull();
  });

  it('avisa por qué no se puede mandar', () => {
    expect(attachmentProblem({ type: 'image/gif', size: 10 })).toBe(
      'Solo se pueden mandar PDF, JPG o PNG.',
    );
    expect(attachmentProblem({ type: 'application/pdf', size: 0 })).toBe('El archivo está vacío.');
    expect(attachmentProblem({ type: 'application/pdf', size: 10 * 1024 * 1024 + 1 })).toBe(
      'El archivo no puede pasar los 10 MB.',
    );
  });

  it('el tamaño se lee en KB o MB, con coma decimal', () => {
    expect(formatSize(200)).toBe('1 KB');
    expect(formatSize(340 * 1024)).toBe('340 KB');
    expect(formatSize(1.25 * 1024 * 1024)).toBe('1,3 MB');
  });

  it('en la bandeja, un mensaje solo con archivo dice qué es', () => {
    expect(messagePreview({ contenido: '', adjunto: { tipo: 'image/jpeg', tamano: 1 } })).toBe(
      '📎 Foto',
    );
    expect(messagePreview({ contenido: '', adjunto: { tipo: 'application/pdf', tamano: 1 } })).toBe(
      '📎 PDF',
    );
    expect(
      messagePreview({ contenido: 'El estudio', adjunto: { tipo: 'application/pdf', tamano: 1 } }),
    ).toBe('El estudio');
  });
});
