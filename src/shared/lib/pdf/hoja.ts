import type { Content, ContentTable, TDocumentDefinitions } from 'pdfmake/interfaces';

/**
 * Las piezas de las hojas en PDF (ENG-231): encabezado con el logo, indicadores,
 * bloques con título, tablas de concepto y valor, y el pie con cuándo se
 * generó y el número de página. Es el mismo diseño de las hojas que antes se
 * imprimían desde el navegador.
 */

/** Los colores de la interfaz (`index.css`). */
export const COLOR = {
  brand: '#14b8a6',
  brandHover: '#0e7c7b',
  brandDeep: '#0b4f6c',
  ink: '#1e293b',
  muted: '#64748b',
  mutedSoft: '#94a3b8',
  line: '#e3ebee',
  lineStrong: '#cfdde3',
  surface: '#f4f8fa',
  danger: '#d64562',
} as const;

/** 1 mm en puntos de PDF. */
export const MM = 72 / 25.4;

/** Ancho útil de una hoja A4 con 15 mm de margen a cada lado. */
export const ANCHO_UTIL = 595.28 - 30 * MM;

const ZONA = 'America/Argentina/Buenos_Aires';

const GENERADO = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: ZONA,
});

const DIA_ISO = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: ZONA,
});

/** "24 de noviembre de 2026, 10:15": cuándo se generó el documento. */
export function generadoEl(ahora: Date = new Date()): string {
  return GENERADO.format(ahora);
}

/** `2026-11-24`: el día de hoy en Argentina, para el nombre del archivo. */
export function hoyIso(ahora: Date = new Date()): string {
  return DIA_ISO.format(ahora);
}

/**
 * Un nombre de archivo sin tildes, espacios ni símbolos:
 * `["Historia clínica", "Juan Pérez"]` → `historia-clinica-juan-perez`.
 */
export function nombreDeArchivo(...partes: (string | undefined)[]): string {
  return partes
    .filter((p): p is string => !!p && p.trim() !== '')
    .join(' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Un texto con partes en negrita: `['Cancelaciones', ': turnos...']`. */
export type Parrafo = string | { negrita: string; resto: string };

function parrafo(p: Parrafo): Content {
  return typeof p === 'string' ? { text: p } : { text: [{ text: p.negrita, bold: true }, p.resto] };
}

/** Pie de cada hoja: aclaraciones (solo en la última), cuándo se generó y la página. */
function pie(generado: string, leyenda: string) {
  return (pagina: number, paginas: number): Content => ({
    margin: [15 * MM, 4 * MM, 15 * MM, 0],
    columns: [
      { text: `${leyenda} · Generado el ${generado} (hora de Argentina)`, width: '*' },
      // Ancho fijo: con `auto`, una leyenda larga le come el lugar y el número
      // de página se parte en dos líneas.
      { text: `Página ${pagina} de ${paginas}`, width: 64, alignment: 'right' },
    ],
    columnGap: 12,
    fontSize: 7.5,
    color: COLOR.muted,
  });
}

/** Opciones comunes a todas las hojas: A4, márgenes, fuentes y metadatos. */
export function documento({
  titulo,
  contenido,
  leyenda = 'MediConnect',
  encabezado,
  ahora = new Date(),
}: {
  /** Título del documento: también va en las propiedades del PDF. */
  titulo: string;
  contenido: Content[];
  /** Lo que se repite al pie de cada hoja, antes de la fecha de generación. */
  leyenda?: string;
  /** Una línea corrida arriba de cada hoja desde la segunda. */
  encabezado?: string;
  ahora?: Date;
}): TDocumentDefinitions {
  const generado = generadoEl(ahora);
  return {
    pageSize: 'A4',
    pageMargins: [15 * MM, 16 * MM, 15 * MM, 16 * MM],
    info: { title: titulo, author: 'MediConnect', creator: 'MediConnect' },
    defaultStyle: { font: 'Manrope', fontSize: 10, color: COLOR.ink, lineHeight: 1.25 },
    header: encabezado
      ? (pagina: number): Content =>
          pagina === 1
            ? { text: '' }
            : {
                margin: [15 * MM, 8 * MM, 15 * MM, 0],
                columns: [
                  { text: encabezado, width: '*' },
                  { text: `Emitida el ${generado}`, width: 'auto' },
                ],
                fontSize: 7.5,
                color: COLOR.muted,
              }
      : undefined,
    footer: pie(generado, leyenda),
    content: contenido,
  };
}

/**
 * La cabecera de la primera hoja: logo, título y a quién corresponde a la
 * izquierda; el período y su rango a la derecha; una raya azul debajo.
 */
export function cabecera({
  titulo,
  persona,
  derecha,
  destacarPrimera = true,
}: {
  titulo: string;
  persona?: string;
  /** Líneas de la derecha: la primera va destacada ("Últimos 3 meses"). */
  derecha: string[];
  /** Sin destacar, todas las líneas de la derecha van iguales, en gris. */
  destacarPrimera?: boolean;
}): Content {
  const [destacada, ...resto] = destacarPrimera ? derecha : [undefined, ...derecha];
  return {
    stack: [
      {
        columns: [
          {
            width: '*',
            stack: [
              { image: 'logo', fit: [92, 12] },
              {
                text: titulo,
                font: 'Newsreader',
                fontSize: 26,
                color: COLOR.brandDeep,
                lineHeight: 1.05,
                margin: [0, 10, 0, 0],
              },
              ...(persona
                ? [{ text: persona, font: 'ManropeSemibold', fontSize: 11.5, margin: [0, 3, 0, 0] }]
                : []),
            ] as Content[],
          },
          {
            width: 'auto',
            alignment: 'right',
            stack: [
              ...(destacada
                ? [
                    {
                      text: destacada.toUpperCase(),
                      bold: true,
                      fontSize: 8.5,
                      characterSpacing: 1,
                      color: COLOR.brandHover,
                    },
                  ]
                : []),
              ...resto.map((linea) => ({ text: linea, fontSize: 8.5, color: COLOR.muted })),
            ] as Content[],
            margin: [0, 0, 0, 2],
          },
        ],
        columnGap: 16,
      },
      raya(COLOR.brandDeep, 1.5, [0, 10, 0, 0]),
    ],
  };
}

/** Una línea horizontal a todo el ancho. */
export function raya(
  color: string = COLOR.line,
  grosor = 0.75,
  margin: [number, number, number, number] = [0, 0, 0, 0],
): Content {
  return {
    canvas: [
      { type: 'line', x1: 0, y1: 0, x2: ANCHO_UTIL, y2: 0, lineWidth: grosor, lineColor: color },
    ],
    margin,
  };
}

/** Una caja con borde fino: los indicadores y las fichas. */
export function caja(contenido: Content, relleno = 10): ContentTable {
  return {
    table: { widths: ['*'], body: [[contenido]] },
    layout: {
      hLineColor: () => COLOR.line,
      vLineColor: () => COLOR.line,
      hLineWidth: () => 0.75,
      vLineWidth: () => 0.75,
      paddingLeft: () => relleno,
      paddingRight: () => relleno,
      paddingTop: () => relleno,
      paddingBottom: () => relleno,
    },
  };
}

/** Un rótulo chico en mayúsculas ("CONSULTAS REALIZADAS"). */
export function rotulo(texto: string, color: string = COLOR.muted): Content {
  return { text: texto.toUpperCase(), fontSize: 7, bold: true, characterSpacing: 1, color };
}

export type Kpi = {
  etiqueta: string;
  valor: string;
  detalle?: string;
  /** En gris: el valor es cero o no hay dato. */
  apagado?: boolean;
  /** Un valor largo (un nombre, una fecha) va más chico. */
  chico?: boolean;
};

/**
 * Una fila de indicadores grandes, de igual ancho y alto. Es una tabla de una
 * fila (así todas las cajas miden lo que la más alta) con columnas angostas
 * sin borde entre caja y caja.
 */
export function indicadores(kpis: Kpi[]): Content {
  const GAP = 8;
  const celdas: Content[] = [];
  const anchos: (string | number)[] = [];
  kpis.forEach((k, i) => {
    if (i > 0) {
      celdas.push({ text: '' });
      anchos.push(GAP);
    }
    anchos.push('*');
    celdas.push({
      stack: [
        rotulo(k.etiqueta),
        {
          text: k.valor,
          font: 'Newsreader',
          fontSize: k.chico ? 13 : 22,
          color: k.apagado ? COLOR.muted : COLOR.brandDeep,
          margin: [0, 5, 0, 0],
          lineHeight: 1.05,
        },
        ...(k.detalle
          ? [{ text: k.detalle, fontSize: 7.5, color: COLOR.muted, margin: [0, 5, 0, 0] }]
          : []),
      ] as Content[],
    });
  });
  const esHueco = (columna: number) => columna % 2 === 1;
  return {
    table: { widths: anchos, body: [celdas] },
    layout: {
      hLineWidth: (_i: number, _n: unknown, columna?: number) =>
        columna !== undefined && esHueco(columna) ? 0 : 0.75,
      vLineWidth: () => 0.75,
      hLineColor: () => COLOR.line,
      vLineColor: () => COLOR.line,
      paddingLeft: (columna: number) => (esHueco(columna) ? 0 : 10),
      paddingRight: (columna: number) => (esHueco(columna) ? 0 : 10),
      paddingTop: () => 10,
      paddingBottom: () => 10,
    },
    margin: [0, 16, 0, 0],
  };
}

/** Un bloque con título ("PAGOS") y su contenido; no se parte entre hojas. */
export function bloque(titulo: string, contenido: Content): Content {
  return {
    stack: [rotulo(titulo, COLOR.brandDeep), conMargen(contenido, [0, 6, 0, 0])],
    unbreakable: true,
  };
}

/** El contenido con un margen propio, sin tocar el nodo original. */
export function conMargen(contenido: Content, margin: [number, number, number, number]): Content {
  return { stack: [contenido], margin };
}

/** Dos bloques lado a lado. */
export function dosColumnas(izquierda: Content, derecha: Content): Content {
  return { columns: [izquierda, derecha], columnGap: 22, margin: [0, 18, 0, 0] };
}

export type Fila = { concepto: string; valor: string; destacado?: boolean };

/** Tabla de dos columnas (concepto · valor) con una raya arriba de cada fila. */
export function tablaDetalle(filas: Fila[]): Content {
  return {
    table: {
      widths: ['*', 'auto'],
      body: filas.map((f) => [
        {
          text: f.concepto,
          bold: f.destacado,
          color: f.destacado ? COLOR.brandDeep : COLOR.ink,
        },
        {
          text: f.valor,
          alignment: 'right',
          font: f.destacado ? 'Manrope' : 'ManropeSemibold',
          bold: f.destacado,
          color: f.destacado ? COLOR.brandDeep : COLOR.ink,
        },
      ]),
    },
    layout: {
      hLineWidth: (i: number) =>
        i < filas.length && filas[i].destacado ? 1.5 : i === filas.length ? 0 : 0.75,
      hLineColor: (i: number) =>
        i < filas.length && filas[i].destacado ? COLOR.brandDeep : COLOR.line,
      vLineWidth: () => 0,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 5,
      paddingBottom: () => 5,
    },
    fontSize: 9,
  };
}

/** Las aclaraciones al final de la hoja, en chico y gris. */
export function aclaraciones(parrafos: Parrafo[]): Content {
  return {
    stack: [
      raya(COLOR.line, 0.75, [0, 22, 0, 6]),
      ...parrafos.map((p) => conMargen(parrafo(p), [0, 0, 0, 4])),
    ] as Content[],
    fontSize: 7.5,
    color: COLOR.muted,
    unbreakable: true,
  };
}

/**
 * Todo el texto de un documento, en orden y separado por espacios. Para los
 * tests: dice qué dice el PDF sin tener que renderizarlo.
 */
export function textoDe(nodo: unknown): string {
  const partes: string[] = [];
  const recorrer = (n: unknown): void => {
    if (n === null || n === undefined) return;
    if (typeof n === 'string' || typeof n === 'number') {
      partes.push(String(n));
      return;
    }
    if (Array.isArray(n)) {
      n.forEach(recorrer);
      return;
    }
    if (typeof n === 'object') {
      const o = n as Record<string, unknown>;
      for (const clave of ['text', 'stack', 'columns', 'ul', 'ol', 'content', 'qr']) {
        if (clave in o) recorrer(o[clave]);
      }
      if (o.table && typeof o.table === 'object') {
        recorrer((o.table as { body?: unknown }).body);
      }
    }
  };
  recorrer(nodo);
  return partes.join(' ').replace(/\s+/g, ' ').trim();
}

const FECHA_LARGA = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** `2026-09-01` → "1 de septiembre de 2026". Al mediodía UTC: sin corrimiento de día. */
export function fechaLarga(dia: string): string {
  return FECHA_LARGA.format(new Date(`${dia}T12:00:00Z`));
}

/** "Del 1 de septiembre al 30 de noviembre de 2026", sin repetir el año si es el mismo. */
export function rangoLegible(from: string, to: string): string {
  const desde = fechaLarga(from);
  const hasta = fechaLarga(to);
  const mismoAnio = from.slice(0, 4) === to.slice(0, 4);
  return `Del ${mismoAnio ? desde.replace(/ de \d{4}$/, '') : desde} al ${hasta}`;
}
