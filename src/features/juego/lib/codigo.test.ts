import { describe, expect, it } from 'vitest';
import { armarGuardia, CASOS, PACIENTES_POR_GUARDIA } from './casos';
import { codigoDe, GRACIA_MS, leerCodigo, ROTACION_JUEGO_MS, ventanaDe } from './codigo';

const AHORA = Date.UTC(2026, 9, 6, 15, 0, 10); // 10 s dentro de la ventana

describe('código rotativo del juego', () => {
  it('el código de la ventana actual abre la ficha del paciente correcto', () => {
    const codigo = codigoDe('juan', ventanaDe(AHORA));
    const lectura = leerCodigo(codigo, AHORA);
    expect(lectura.estado).toBe('VIGENTE');
    expect(lectura.estado === 'VIGENTE' && lectura.caso.id).toBe('juan');
  });

  it('un código de hace un minuto está vencido', () => {
    const viejo = codigoDe('juan', ventanaDe(AHORA - 2 * ROTACION_JUEGO_MS));
    expect(leerCodigo(viejo, AHORA).estado).toBe('VENCIDO');
  });

  it('el código recién rotado se acepta durante la gracia, y después no', () => {
    const inicio = ventanaDe(AHORA) * ROTACION_JUEGO_MS;
    const anterior = codigoDe('sofia', ventanaDe(AHORA) - 1);
    expect(leerCodigo(anterior, inicio + GRACIA_MS - 1).estado).toBe('VIGENTE');
    expect(leerCodigo(anterior, inicio + GRACIA_MS + 1).estado).toBe('VENCIDO');
  });

  it('acepta el código con guión y en minúscula', () => {
    const codigo = codigoDe('lucas', ventanaDe(AHORA)).toLowerCase();
    expect(leerCodigo(`${codigo.slice(0, 3)}-${codigo.slice(3)}`, AHORA).estado).toBe('VIGENTE');
  });

  it('un código inventado no se reconoce', () => {
    expect(leerCodigo('ZZZZZZ', AHORA).estado).toBe('INVALIDO');
  });

  it('dos pacientes no comparten código en la misma ventana', () => {
    const codigos = CASOS.map((c) => codigoDe(c.id, ventanaDe(AHORA)));
    expect(new Set(codigos).size).toBe(CASOS.length);
  });
});

describe('armarGuardia', () => {
  it('arma tres pacientes distintos, cada uno con una sola opción correcta', () => {
    const guardia = armarGuardia();
    expect(guardia).toHaveLength(PACIENTES_POR_GUARDIA);
    expect(new Set(guardia.map((c) => c.id)).size).toBe(PACIENTES_POR_GUARDIA);
    for (const caso of guardia) {
      expect(caso.opciones.filter((o) => o.correcta)).toHaveLength(1);
    }
  });

  it('cada opción incorrecta dice qué le pasó al paciente', () => {
    for (const caso of CASOS) {
      for (const opcion of caso.opciones.filter((o) => !o.correcta)) {
        expect(opcion.causa, `${caso.id}: ${opcion.texto}`).toBeTruthy();
      }
    }
  });
});
