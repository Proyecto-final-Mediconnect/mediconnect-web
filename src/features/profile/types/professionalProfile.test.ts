import { describe, expect, it } from 'vitest';
import { professionalProfileSchema } from './professionalProfile';

const valid = {
  bio: 'Cardióloga con 10 años de experiencia.',
  consultationPrice: 15000,
  specialtyIds: ['s1', 's2'],
};

describe('professionalProfileSchema', () => {
  it('acepta datos válidos', () => {
    expect(professionalProfileSchema.safeParse(valid).success).toBe(true);
  });

  it('acepta precio null (perfil sin precio cargado)', () => {
    expect(
      professionalProfileSchema.safeParse({ ...valid, consultationPrice: null })
        .success,
    ).toBe(true);
  });

  it('rechaza bio de más de 500 caracteres', () => {
    expect(
      professionalProfileSchema.safeParse({ ...valid, bio: 'a'.repeat(501) })
        .success,
    ).toBe(false);
  });

  it('rechaza más de 3 especialidades', () => {
    expect(
      professionalProfileSchema.safeParse({
        ...valid,
        specialtyIds: ['s1', 's2', 's3', 's4'],
      }).success,
    ).toBe(false);
  });

  it('rechaza precio negativo', () => {
    expect(
      professionalProfileSchema.safeParse({ ...valid, consultationPrice: -1 })
        .success,
    ).toBe(false);
  });
});
