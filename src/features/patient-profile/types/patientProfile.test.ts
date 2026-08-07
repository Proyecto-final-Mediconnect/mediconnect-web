import { describe, expect, it } from 'vitest';
import { normalizeDni, patientProfileSchema } from './patientProfile';

const valid = {
  firstName: 'Ana',
  lastName: 'Paciente',
  birthDate: '1990-05-20',
  dni: '12345678',
  phone: '+54 11 5555-5555',
};

describe('patientProfileSchema', () => {
  it('acepta datos válidos', () => {
    expect(patientProfileSchema.safeParse(valid).success).toBe(true);
  });

  it('normaliza el DNI con puntos y lo deja en dígitos', () => {
    const parsed = patientProfileSchema.safeParse({ ...valid, dni: '12.345.678' });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.dni).toBe('12345678');
  });

  it('acepta un DNI de 7 dígitos', () => {
    expect(patientProfileSchema.safeParse({ ...valid, dni: '1234567' }).success).toBe(true);
  });

  it('rechaza DNI con letras o largo inválido', () => {
    expect(patientProfileSchema.safeParse({ ...valid, dni: 'AB123456' }).success).toBe(false);
    expect(patientProfileSchema.safeParse({ ...valid, dni: '123' }).success).toBe(false);
  });

  it('exige nombre y apellido', () => {
    expect(patientProfileSchema.safeParse({ ...valid, firstName: '' }).success).toBe(false);
    expect(patientProfileSchema.safeParse({ ...valid, lastName: '   ' }).success).toBe(false);
  });

  it('rechaza una fecha de nacimiento futura', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(
      patientProfileSchema.safeParse({
        ...valid,
        birthDate: future.toISOString().slice(0, 10),
      }).success,
    ).toBe(false);
  });

  it('rechaza un teléfono con caracteres no válidos', () => {
    expect(patientProfileSchema.safeParse({ ...valid, phone: '11-abc-99' }).success).toBe(false);
  });

  it('normalizeDni deja solo dígitos', () => {
    expect(normalizeDni('12.345.678')).toBe('12345678');
  });
});
