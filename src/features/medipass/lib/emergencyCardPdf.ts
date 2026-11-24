import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { COLOR, documento, MM } from '../../../shared/lib/pdf/hoja';

/** Tamaño de una tarjeta de crédito (ISO/IEC 7810 ID-1). */
const ANCHO = 85.6 * MM;
const ALTO = 54 * MM;
/** Margen entre la tarjeta y la línea de corte. */
const CORTE = 3 * MM;

/**
 * La hoja de la tarjeta de emergencia del MediPass en PDF (ENG-176, ENG-231):
 * la tarjeta a tamaño real dentro de una línea punteada para recortarla, y las
 * instrucciones.
 *
 * El QR lleva el token en el fragmento de la URL (`#…`), que el navegador no
 * manda al servidor. El PDF se arma en el navegador: el token no sale de la
 * pantalla de quien lo generó.
 */
export function emergencyCardPdf({
  url,
  nombre,
  sessionMinutes,
  ahora,
}: {
  /** Lo que codifica el QR: la vista de emergencia con el token. */
  url: string;
  nombre: string;
  /** Cuántos minutos dura el acceso, según el backend. */
  sessionMinutes?: number;
  ahora?: Date;
}): TDocumentDefinitions {
  const tarjeta = {
    columns: [
      { width: 'auto', qr: url, fit: 104, eccLevel: 'H', foreground: COLOR.ink },
      {
        width: '*',
        stack: [
          {
            text: 'EMERGENCIA MÉDICA',
            fontSize: 6.5,
            bold: true,
            characterSpacing: 1,
            color: COLOR.danger,
          },
          ...(nombre
            ? [
                {
                  text: nombre,
                  fontSize: 10,
                  bold: true,
                  color: COLOR.brandDeep,
                  lineHeight: 1.1,
                  margin: [0, 3, 0, 0],
                },
              ]
            : []),
          {
            text: 'Escaneá este código con la cámara para ver mis alergias, medicación y contacto de emergencia.',
            fontSize: 7,
            lineHeight: 1.3,
            margin: [0, 5, 0, 0],
          },
          {
            text: 'MediConnect · MediPass',
            fontSize: 6.5,
            color: COLOR.muted,
            margin: [0, 5, 0, 0],
          },
        ] as Content[],
        margin: [0, 4, 0, 0],
      },
    ],
    columnGap: 4 * MM,
  } satisfies Content;

  return documento({
    titulo: 'Tarjeta de emergencia MediPass',
    ahora,
    contenido: [
      { image: 'logo', fit: [105, 14] },
      {
        text: 'Tu tarjeta de emergencia MediPass',
        font: 'Newsreader',
        fontSize: 22,
        color: COLOR.brandDeep,
        margin: [0, 16, 0, 0],
      },
      {
        text: 'Recortala por la línea punteada y llevala en la billetera. Si alguien tiene que atenderte y no puede hablar, escanea el código y ve tus alergias, medicación y contacto de emergencia.',
        fontSize: 10,
        color: COLOR.muted,
        lineHeight: 1.35,
        margin: [0, 6, 0, 0],
      },
      {
        stack: [
          {
            // La línea de corte, punteada, y la tarjeta con borde rojo.
            canvas: [
              {
                type: 'rect',
                x: 0,
                y: 0,
                w: ANCHO + 2 * CORTE,
                h: ALTO + 2 * CORTE,
                lineWidth: 0.75,
                lineColor: COLOR.mutedSoft,
                dash: { length: 3, space: 2 },
              },
              {
                type: 'rect',
                x: CORTE,
                y: CORTE,
                w: ANCHO,
                h: ALTO,
                r: 3 * MM,
                lineWidth: 1.5,
                lineColor: COLOR.danger,
              },
            ],
          },
          {
            columns: [{ width: ANCHO - 8 * MM, ...tarjeta }],
            relativePosition: { x: CORTE + 4 * MM, y: -(ALTO + CORTE) + 4 * MM },
          } as Content,
        ],
        // Con esto la tarjeta no ocupa más que su marco: lo que sigue va abajo.
        margin: [0, 22, 0, 0],
      },
      {
        ul: [
          `El código abre${sessionMinutes ? ` ${sessionMinutes} minutos de` : ''} información vital, y cada acceso queda registrado.`,
          'Es personal: no lo compartas ni lo publiques.',
          'Si la perdés, desactivala desde MediPass > Tarjeta de emergencia y generá una nueva.',
        ],
        fontSize: 10,
        lineHeight: 1.35,
        margin: [0, 22, 0, 0],
      },
    ],
  });
}
