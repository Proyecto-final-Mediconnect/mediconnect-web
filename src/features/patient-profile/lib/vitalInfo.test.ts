import { describe, expect, it } from 'vitest';
import { EMPTY_ALLERGY, isEmpty, toForm, toInput } from './vitalInfo';

const vacio = toForm(undefined);

describe('vitalInfo (ENG-136)', () => {
  it('sin nada cargado no manda nada y cuenta como vacío', () => {
    expect(toInput(vacio)).toEqual({
      input: {
        sex: undefined,
        bloodType: undefined,
        allergies: undefined,
        medications: undefined,
        conditions: undefined,
        emergencyContact: undefined,
      },
      errors: {},
    });
    expect(isEmpty(vacio)).toBe(true);
  });

  it('descarta las filas vacías y recorta los textos', () => {
    const { input, errors } = toInput({
      ...vacio,
      allergies: [{ que: '  Penicilina ', gravedad: '' }, { ...EMPTY_ALLERGY }],
    });
    expect(errors).toEqual({});
    expect(input.allergies).toEqual([{ que: 'Penicilina', gravedad: undefined }]);
  });

  it('una fila con datos pero sin lo principal es un error en ese campo', () => {
    const { errors } = toInput({
      ...vacio,
      allergies: [{ que: '', gravedad: 'Anafilaxia' }],
      medications: [{ droga: '', dosis: '10 mg', nota: '' }],
    });
    expect(errors['allergies.0.que']).toBeDefined();
    expect(errors['medications.0.droga']).toBeDefined();
  });

  it('el contacto necesita nombre y un teléfono válido', () => {
    expect(
      toInput({ ...vacio, contact: { nombre: 'Marina', vinculo: '', telefono: 'abc' } }).errors,
    ).toEqual({ 'contact.telefono': 'Solo números, espacios, guiones y +' });
    expect(
      toInput({ ...vacio, contact: { nombre: '', vinculo: 'Hermana', telefono: '' } }).errors,
    ).toMatchObject({
      'contact.nombre': expect.any(String),
      'contact.telefono': expect.any(String),
    });
  });

  it('precarga lo guardado y vuelve igual', () => {
    const form = toForm({
      profileId: 'p',
      firstName: 'Julián',
      lastName: 'Sosa',
      birthDate: null,
      dni: null,
      phone: null,
      completed: true,
      bloodType: '0+',
      allergies: [{ que: 'Penicilina', gravedad: 'Anafilaxia' }],
      emergencyContact: { nombre: 'Marina', vinculo: 'Hermana', telefono: '+54 351 555 2210' },
    });
    expect(form.bloodType).toBe('0+');
    expect(toInput(form).input).toMatchObject({
      bloodType: '0+',
      allergies: [{ que: 'Penicilina', gravedad: 'Anafilaxia' }],
      emergencyContact: { nombre: 'Marina', vinculo: 'Hermana', telefono: '+54 351 555 2210' },
    });
    expect(isEmpty(form)).toBe(false);
  });
});
