import { describe, expect, it } from 'vitest';
import { registerProfessionalSchema } from './registerProfessional';

const valid = {
  email: 'pro@test.com',
  password: 'Password1',
  passwordConfirmation: 'Password1',
  firstName: 'Ana',
  lastName: 'García',
  specialty: 'Cardiología',
  licenseNumber: 'MP-12345',
  acceptedLegal: true,
};

describe('registerProfessionalSchema', () => {
  it('acepta datos válidos', () => {
    expect(registerProfessionalSchema.safeParse(valid).success).toBe(true);
  });

  it('rechaza email con formato inválido', () => {
    const res = registerProfessionalSchema.safeParse({
      ...valid,
      email: 'nope',
    });
    expect(res.success).toBe(false);
  });

  it('rechaza nombre o apellido demasiado cortos', () => {
    expect(registerProfessionalSchema.safeParse({ ...valid, firstName: 'A' }).success).toBe(false);
    expect(registerProfessionalSchema.safeParse({ ...valid, lastName: '' }).success).toBe(false);
  });

  it('rechaza especialidad vacía', () => {
    expect(registerProfessionalSchema.safeParse({ ...valid, specialty: '' }).success).toBe(false);
  });

  it('rechaza matrícula con formato inválido', () => {
    expect(registerProfessionalSchema.safeParse({ ...valid, licenseNumber: 'ab' }).success).toBe(
      false,
    );
  });

  it('rechaza confirmación que no coincide y apunta al campo correcto', () => {
    const res = registerProfessionalSchema.safeParse({
      ...valid,
      passwordConfirmation: 'Password2',
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.path).toContain('passwordConfirmation');
    }
  });

  it('rechaza el registro sin aceptar los textos legales (ENG-140)', () => {
    const res = registerProfessionalSchema.safeParse({ ...valid, acceptedLegal: false });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.path).toContain('acceptedLegal');
    }
  });
});
