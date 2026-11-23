import { describe, expect, it } from 'vitest';
import { TEST_PUBLIC_CONFIG } from '../../../shared/config/testPublicConfig';
import {
  PAGE_DAYS,
  daysOfPage,
  firstAvailableIndex,
  formatDate,
  formatMonth,
  formatPrice,
  formatRange,
  formatShortDate,
  horizonRange,
  todayAR,
  indexOfDate,
  monthsInWindow,
  lastPageFor,
  pageOfIndex,
} from './weeks';

/** El horizonte que informa hoy el backend (`GET /config`). */
const HORIZON = TEST_PUBLIC_CONFIG.booking.horizonDays;

/** Día con la forma mínima que mira `firstAvailableIndex`. */
const dia = (...estados: string[]) => ({ slots: estados.map((status) => ({ status })) });

describe('horizonRange', () => {
  it('arranca HOY, no el lunes de la semana en curso', () => {
    // El bug que motivó el cambio: un sábado, cinco de las siete tarjetas eran
    // días que ya habían pasado.
    expect(horizonRange(HORIZON, '2026-08-22')).toEqual({
      from: '2026-08-22',
      to: '2026-10-20',
    });
  });

  it('cubre exactamente el horizonte que informa el backend', () => {
    const { from, to } = horizonRange(HORIZON, '2026-08-19');
    const dias = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1;

    expect(dias).toBe(HORIZON);
  });

  it('con otro horizonte, otro rango: no hay un número fijo de este lado', () => {
    expect(horizonRange(14, '2026-08-19')).toEqual({ from: '2026-08-19', to: '2026-09-01' });
  });
});

describe('lastPageFor', () => {
  it('se pagina de a siete días y la última página corta también cuenta', () => {
    // 60 no es múltiplo de 7: la última página queda con 4 días, y tiene que
    // existir igual o esos días serían inalcanzables.
    expect(lastPageFor(60)).toBe(8);
    expect(lastPageFor(56)).toBe(7);
    expect(lastPageFor(1)).toBe(0);
    expect(lastPageFor(0)).toBe(0);
  });
});

describe('daysOfPage', () => {
  const todos = Array.from({ length: 60 }, (_, i) => i);

  it('recorta los siete días de la página', () => {
    expect(daysOfPage(todos, 0)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(daysOfPage(todos, 2)).toEqual([14, 15, 16, 17, 18, 19, 20]);
  });

  it('devuelve vacío más allá de lo que hay', () => {
    expect(daysOfPage(todos, 20)).toEqual([]);
  });

  /** 60 días no dan nueve páginas completas: la última tiene cuatro. Se devuelve
   *  corta en vez de rellenar, y la grilla dibuja las tarjetas que hay. */
  it('la última página queda corta y no se rellena', () => {
    expect(daysOfPage(todos, lastPageFor(todos.length))).toHaveLength(4);
  });
});

describe('monthsInWindow', () => {
  it('agrupa los días por mes y guarda dónde arranca cada uno', () => {
    expect(monthsInWindow(['2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02'])).toEqual([
      { key: '2026-08', index: 0 },
      { key: '2026-09', index: 2 },
    ]);
  });

  /** El primer mes apunta al día 0 aunque la ventana arranque a mitad de mes:
   *  el botón lleva al principio de LO QUE HAY, no al 1 de un mes ya empezado. */
  it('el primer mes apunta al comienzo de la ventana', () => {
    expect(monthsInWindow(['2026-08-22', '2026-08-23'])[0]).toEqual({
      key: '2026-08',
      index: 0,
    });
  });

  it('con la ventana vacía no devuelve meses', () => {
    expect(monthsInWindow([])).toEqual([]);
  });

  it('nombra el mes en español', () => {
    expect(formatMonth('2026-09')).toBe('septiembre');
    expect(formatMonth('2026-12')).toBe('diciembre');
  });
});

describe('indexOfDate', () => {
  it('ubica la fecha dentro de la ventana', () => {
    expect(indexOfDate(['2026-08-22', '2026-08-23', '2026-08-24'], '2026-08-24')).toBe(2);
  });

  /** El input de fecha ya acota con `min`/`max`, pero eso es una comodidad del
   *  navegador: saltar valida igual. */
  it('devuelve -1 para una fecha fuera del horizonte', () => {
    expect(indexOfDate(['2026-08-22'], '2027-01-01')).toBe(-1);
  });
});

describe('pageOfIndex', () => {
  it('ubica cada día en su página', () => {
    expect(pageOfIndex(0)).toBe(0);
    expect(pageOfIndex(PAGE_DAYS - 1)).toBe(0);
    expect(pageOfIndex(PAGE_DAYS)).toBe(1);
    expect(pageOfIndex(20)).toBe(2);
  });
});

describe('firstAvailableIndex', () => {
  it('encuentra el primer día con un horario reservable', () => {
    expect(firstAvailableIndex([dia('BOOKED'), dia('AVAILABLE')])).toBe(1);
  });

  /**
   * El otro síntoma reportado: "me muestra días con turnos no disponibles". Un
   * día lleno de turnos ocupados TIENE horarios, así que el criterio anterior
   * —el primer día con `slots.length > 0`— lo abría igual.
   */
  it('saltea los días que tienen horarios pero ninguno libre', () => {
    expect(
      firstAvailableIndex([
        dia('PAST', 'PAST'),
        dia('BOOKED', 'BOOKED'),
        dia('BLOCKED'),
        dia('BOOKED', 'AVAILABLE'),
      ]),
    ).toBe(3);
  });

  it('saltea los días sin horarios publicados', () => {
    expect(firstAvailableIndex([dia(), dia(), dia('AVAILABLE')])).toBe(2);
  });

  it('devuelve -1 cuando no hay nada reservable en todo el horizonte', () => {
    expect(firstAvailableIndex([dia('BOOKED'), dia('PAST')])).toBe(-1);
  });

  it('devuelve -1 con la lista vacía', () => {
    expect(firstAvailableIndex([])).toBe(-1);
  });
});

describe('formato', () => {
  it('escribe la fecha en español', () => {
    expect(formatDate('2026-09-02')).toBe('2 de septiembre');
    expect(formatDate('2026-01-31')).toBe('31 de enero');
  });

  it('no repite el mes en el rótulo del rango si los dos extremos caen en el mismo', () => {
    expect(formatRange('2026-11-15', '2026-11-21')).toBe('Del 15 al 21 de noviembre');
    expect(formatRange('2026-11-28', '2026-12-04')).toBe('Del 28 de noviembre al 4 de diciembre');
    expect(formatRange('2027-01-13', '2027-01-13')).toBe('El 13 de enero');
  });

  it('acorta la fecha para los encabezados de la grilla', () => {
    expect(formatShortDate('2026-09-02')).toBe('2/9');
  });

  it('muestra el precio en pesos y sin decimales', () => {
    // El separador que devuelve Intl varía entre entornos; lo que importa es que
    // el número esté completo y sin centavos.
    const formatted = formatPrice(15000, 'ARS');

    expect(formatted).toContain('15');
    expect(formatted).toContain('000');
    expect(formatted).not.toContain(',00');
  });
});

describe('todayAR', () => {
  it('da el día argentino aunque en UTC ya sea el siguiente', () => {
    // 01:00 UTC del 18 = 22:00 del 17 en Argentina.
    expect(todayAR(new Date('2026-08-18T01:00:00Z'))).toBe('2026-08-17');
    expect(todayAR(new Date('2026-08-18T04:00:00Z'))).toBe('2026-08-18');
  });
});
