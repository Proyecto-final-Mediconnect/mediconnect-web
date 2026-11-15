import { describe, expect, it } from 'vitest';
import { dashboardPathFor, DASHBOARD_BY_ROLE } from './session';

describe('dashboardPathFor (ENG-44)', () => {
  it('manda a cada rol a su propio dashboard', () => {
    expect(dashboardPathFor('PACIENTE')).toBe('/paciente');
    expect(dashboardPathFor('PROFESIONAL')).toBe('/profesional');
  });

  it('cubre todos los roles del dominio, sin rutas repetidas', () => {
    const rutas = Object.values(DASHBOARD_BY_ROLE);
    expect(rutas).toHaveLength(2);
    expect(new Set(rutas).size).toBe(2);
  });
});
