import { describe, expect, it } from 'vitest';
import { hoyIso, nombreDeArchivo, rangoLegible, textoDe } from './hoja';

describe('hoja de los PDF (ENG-231)', () => {
  it('arma nombres de archivo sin tildes, espacios ni símbolos', () => {
    expect(nombreDeArchivo('historia clinica', 'Julián Pérez Ñandú', '2026-11-24')).toBe(
      'historia-clinica-julian-perez-nandu-2026-11-24',
    );
    expect(nombreDeArchivo('historia clinica', undefined, '2026-11-24')).toBe(
      'historia-clinica-2026-11-24',
    );
    expect(nombreDeArchivo('  O’Brien / López  ')).toBe('o-brien-lopez');
  });

  it('el día del nombre de archivo es el de Argentina, no el UTC', () => {
    // 01:30 UTC del 25 son las 22:30 del 24 en Buenos Aires.
    expect(hoyIso(new Date('2026-11-25T01:30:00Z'))).toBe('2026-11-24');
  });

  it('escribe el rango sin repetir el año cuando es el mismo', () => {
    expect(rangoLegible('2026-09-01', '2026-11-30')).toBe(
      'Del 1 de septiembre al 30 de noviembre de 2026',
    );
    expect(rangoLegible('2025-12-01', '2026-01-31')).toBe(
      'Del 1 de diciembre de 2025 al 31 de enero de 2026',
    );
  });

  it('textoDe junta el texto de un documento en orden', () => {
    expect(
      textoDe([
        { text: 'Hola' },
        { columns: [{ text: ['Firmado por ', { text: 'Ana', bold: true }] }] },
        { table: { body: [['Total', '5']] } },
        { qr: 'https://x/#t=1' },
      ]),
    ).toBe('Hola Firmado por Ana Total 5 https://x/#t=1');
  });
});
