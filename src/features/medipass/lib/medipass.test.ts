import { describe, expect, it } from 'vitest';
import {
  ROTACION_MS,
  accesosVigentes,
  cuentaRegresiva,
  estadoDeAcceso,
  msHastaRotacion,
  muestraBloque,
  normalizarAlcance,
} from './medipass';
import type { MediPassAccess } from '../types/medipass';

const AHORA = new Date('2026-09-03T12:00:00.000Z');

function acceso(overrides: Partial<MediPassAccess> & { id: string }): MediPassAccess {
  return {
    quien: 'Dra. Valeria Ocampo',
    contexto: 'Videoconsulta',
    desde: '2026-09-03T11:50:00.000Z',
    expiraEl: '2026-09-03T12:20:00.000Z',
    alcance: ['VITAL'],
    ...overrides,
  };
}

describe('msHastaRotacion', () => {
  it('se calcula sobre ventanas fijas del reloj, no desde que se abrió la pantalla', () => {
    // 12:00:00 exacto cae en el borde: falta una ventana entera.
    expect(msHastaRotacion(new Date('2026-09-03T12:00:00.000Z'))).toBe(ROTACION_MS);
    // A los dos minutos de la ventana, faltan tres.
    expect(msHastaRotacion(new Date('2026-09-03T12:02:00.000Z'))).toBe(3 * 60_000);
  });

  it('dos personas mirando el mismo MediPass ven el mismo tiempo', () => {
    const momento = new Date('2026-09-03T12:03:20.000Z');

    expect(msHastaRotacion(momento)).toBe(msHastaRotacion(new Date(momento)));
  });
});

describe('estadoDeAcceso', () => {
  it('un acceso que todavía no expiró está vigente', () => {
    expect(estadoDeAcceso(acceso({ id: 'a' }), AHORA)).toEqual({
      estado: 'VIGENTE',
      msRestantes: 20 * 60_000,
    });
  });

  it('el corte es el instante exacto de expiración', () => {
    // Vencido hace un segundo ya no ve nada: mostrarlo vigente le haría creer al
    // paciente que alguien está mirando su historia cuando no.
    const vencido = acceso({ id: 'a', expiraEl: '2026-09-03T11:59:59.000Z' });

    expect(estadoDeAcceso(vencido, AHORA)).toEqual({ estado: 'VENCIDO' });
  });

  it('justo en el instante de expirar ya está vencido', () => {
    const justo = acceso({ id: 'a', expiraEl: AHORA.toISOString() });

    expect(estadoDeAcceso(justo, AHORA).estado).toBe('VENCIDO');
  });
});

describe('accesosVigentes', () => {
  it('deja afuera los vencidos', () => {
    const lista = [
      acceso({ id: 'a' }),
      acceso({ id: 'b', expiraEl: '2026-09-03T10:00:00.000Z' }),
      acceso({ id: 'c', expiraEl: '2026-09-03T12:30:00.000Z' }),
    ];

    expect(accesosVigentes(lista, AHORA).map((x) => x.id)).toEqual(['a', 'c']);
  });
});

describe('cuentaRegresiva', () => {
  it('formatea minutos y segundos', () => {
    expect(cuentaRegresiva(5 * 60_000)).toBe('05:00');
    expect(cuentaRegresiva(62_000)).toBe('01:02');
  });

  it('nunca muestra negativos', () => {
    expect(cuentaRegresiva(-5000)).toBe('00:00');
  });

  it('se corta en 59:59 en vez de agregar un campo de horas', () => {
    expect(cuentaRegresiva(3 * 60 * 60_000)).toBe('59:59');
  });
});

describe('normalizarAlcance', () => {
  it('el bloque vital no se puede apagar', () => {
    // Es la razón de ser del MediPass: sin alergias ni medicación, el pasaporte
    // no sirve para lo único que no puede fallar.
    expect(normalizarAlcance([])).toEqual(['VITAL']);
    expect(normalizarAlcance(['NOTAS'])).toEqual(['VITAL', 'NOTAS']);
  });

  it('no lo duplica si ya está', () => {
    expect(normalizarAlcance(['VITAL', 'NOTAS'])).toEqual(['VITAL', 'NOTAS']);
  });
});

describe('muestraBloque', () => {
  it('el vital se muestra aunque no esté en la lista', () => {
    expect(muestraBloque([], 'VITAL')).toBe(true);
  });

  it('los demás solo si están', () => {
    expect(muestraBloque(['CONDICIONES'], 'CONDICIONES')).toBe(true);
    expect(muestraBloque(['CONDICIONES'], 'NOTAS')).toBe(false);
  });
});
