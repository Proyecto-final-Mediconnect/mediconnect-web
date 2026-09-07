import { describe, expect, it } from 'vitest';
import {
  BOOKING_HORIZON_DAYS,
  BOOKING_PAGES,
  MAX_PAGE,
  PAGE_DAYS,
  daysOfPage,
  firstAvailableIndex,
  formatDate,
  formatMonth,
  formatPrice,
  formatShortDate,
  horizonRange,
  indexOfDate,
  monthsInWindow,
  pageOfIndex,
} from './weeks';

/** Día con la forma mínima que mira `firstAvailableIndex`. */
const dia = (...estados: string[]) => ({ slots: estados.map((status) => ({ status })) });

describe('horizonRange', () => {
  it('arranca HOY, no el lunes de la semana en curso', () => {
    // El bug que motivó el cambio: un sábado, cinco de las siete tarjetas eran
    // días que ya habían pasado.
    expect(horizonRange('2026-08-22')).toEqual({
      from: '2026-08-22',
      to: '2026-10-20',
    });
  });

  it('cubre exactamente el horizonte que publica el backend', () => {
    const { from, to } = horizonRange('2026-08-19');
    const dias =
      (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1;

    expect(dias).toBe(BOOKING_HORIZON_DAYS);
  });

  /**
   * El backend publica 60 días y su tope por consulta es 62 (`MAX_RANGE_DAYS`),
   * justamente para que la pantalla pueda pedir el horizonte entero de una vez.
   * Si el horizonte creciera sin mover el tope, esa consulta sería un 400 — este
   * test fija el número de este lado para que la desincronización se note acá.
   */
  it('el horizonte son dos meses y se pagina de a siete días', () => {
    expect(BOOKING_HORIZON_DAYS).toBe(60);
    // 60 no es múltiplo de 7: la última página queda con 4 días, y tiene que
    // existir igual o esos días serían inalcanzables.
    expect(BOOKING_PAGES).toBe(9);
    expect(MAX_PAGE).toBe(8);
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
    expect(daysOfPage(todos, MAX_PAGE)).toHaveLength(4);
  });
});

describe('monthsInWindow', () => {
  it('agrupa los días por mes y guarda dónde arranca cada uno', () => {
    expect(
      monthsInWindow(['2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02']),
    ).toEqual([
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
