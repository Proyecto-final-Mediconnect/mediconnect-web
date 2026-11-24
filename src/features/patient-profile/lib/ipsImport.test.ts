import { describe, expect, it } from 'vitest';
import { fechaDelDocumento, mergeIps } from './ipsImport';
import type { VitalForm } from './vitalInfo';

const FORM: VitalForm = {
  sex: '',
  bloodType: '0+',
  allergies: [{ que: 'Penicilina', gravedad: 'Anafilaxia' }],
  medications: [],
  conditions: [],
  contact: { nombre: 'Ana', vinculo: '', telefono: '351 555 0000' },
};

describe('mergeIps (ENG-246)', () => {
  it('suma lo elegido sin borrar nada y sin repetir lo que ya estaba', () => {
    const resultado = mergeIps(FORM, {
      allergies: [{ que: 'penicilina', gravedad: 'Grave' }, { que: 'Látex' }],
      medications: [{ droga: 'salbutamol 200 mcg', dosis: '1 disparo' }],
      conditions: [{ nombre: 'asma', codigo: 'SNOMED 195967001' }],
    });

    expect(resultado.allergies).toEqual([
      // Lo que ya tenía queda como estaba, con su gravedad.
      { que: 'Penicilina', gravedad: 'Anafilaxia' },
      { que: 'Látex', gravedad: '' },
    ]);
    expect(resultado.medications).toEqual([
      { droga: 'salbutamol 200 mcg', dosis: '1 disparo', nota: '' },
    ]);
    expect(resultado.conditions).toEqual([{ nombre: 'asma', codigo: 'SNOMED 195967001' }]);
    expect(resultado.bloodType).toBe('0+');
    expect(resultado.contact).toEqual(FORM.contact);
  });

  it('no pasa del máximo de filas que acepta el backend', () => {
    const muchas = Array.from({ length: 40 }, (_, i) => ({ que: `Alergia ${i}` }));

    expect(
      mergeIps(FORM, { allergies: muchas, medications: [], conditions: [] }).allergies,
    ).toHaveLength(30);
  });
});

describe('fechaDelDocumento', () => {
  it('muestra el día del documento, sin correrse por la zona horaria', () => {
    expect(fechaDelDocumento('2018-01-26T14:30:00-03:00')).toBe('26 de enero de 2018');
    expect(fechaDelDocumento(null)).toBeNull();
    expect(fechaDelDocumento('ayer')).toBeNull();
  });
});
