import { describe, expect, it } from 'vitest';
import { registerPatientSchema } from './register';

const valid = {
  email: 'user@test.com',
  password: 'Password1',
  passwordConfirmation: 'Password1',
};

describe('registerPatientSchema', () => {
  it('acepta datos válidos', () => {
    expect(registerPatientSchema.safeParse(valid).success).toBe(true);
  });

  it('rechaza email con formato inválido', () => {
    const res = registerPatientSchema.safeParse({ ...valid, email: 'nope' });
    expect(res.success).toBe(false);
  });

  it('rechaza contraseña corta / sin mayúscula / sin número', () => {
    for (const password of ['Ab1', 'password1', 'Passwordd']) {
      const res = registerPatientSchema.safeParse({
        ...valid,
        password,
        passwordConfirmation: password,
      });
      expect(res.success).toBe(false);
    }
  });

  it('rechaza confirmación que no coincide y apunta al campo correcto', () => {
    const res = registerPatientSchema.safeParse({
      ...valid,
      passwordConfirmation: 'Password2',
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.path).toContain('passwordConfirmation');
    }
  });
});
