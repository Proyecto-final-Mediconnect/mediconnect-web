import { describe, expect, it } from 'vitest';
import { dashboardPathFor, DASHBOARD_BY_ROLE, isKnownRole, roleLabelOf } from './session';

describe('dashboardPathFor (ENG-44)', () => {
  it('manda a cada rol a su propio dashboard', () => {
    expect(dashboardPathFor('PACIENTE')).toBe('/paciente');
    expect(dashboardPathFor('PROFESIONAL')).toBe('/profesional');
    expect(dashboardPathFor('ADMINISTRADOR')).toBe('/admin');
  });

  it('cubre todos los roles del dominio, sin rutas repetidas', () => {
    const rutas = Object.values(DASHBOARD_BY_ROLE);
    expect(rutas).toHaveLength(3);
    expect(new Set(rutas).size).toBe(3);
  });
});

describe('roles residuales', () => {
  it('un rol que el tipo no admite (MODERADOR) no es conocido y se nombra "Usuario"', () => {
    expect(isKnownRole('PACIENTE')).toBe(true);
    expect(isKnownRole('MODERADOR')).toBe(false);
    expect(isKnownRole('toString')).toBe(false);
    expect(roleLabelOf('PROFESIONAL')).toBe('Profesional');
    expect(roleLabelOf('MODERADOR')).toBe('Usuario');
  });

  it('el administrador es un rol conocido (ENG-240)', () => {
    expect(isKnownRole('ADMINISTRADOR')).toBe(true);
    expect(roleLabelOf('ADMINISTRADOR')).toBe('Administrador');
  });
});
