import type { TDocumentDefinitions, TFontDictionary } from 'pdfmake/interfaces';
import manrope400 from '@fontsource/manrope/files/manrope-latin-400-normal.woff?url';
import manrope600 from '@fontsource/manrope/files/manrope-latin-600-normal.woff?url';
import manrope700 from '@fontsource/manrope/files/manrope-latin-700-normal.woff?url';
import manrope800 from '@fontsource/manrope/files/manrope-latin-800-normal.woff?url';
import newsreader400 from '@fontsource/newsreader/files/newsreader-latin-400-normal.woff?url';
import newsreader400i from '@fontsource/newsreader/files/newsreader-latin-400-italic.woff?url';

/**
 * Los PDF de la web (ENG-231): se arman en el navegador y se bajan como archivo,
 * sin pasar por el diálogo de impresión.
 *
 * Antes, "Descargar PDF" llamaba a `window.print()` sobre una hoja oculta:
 * Chrome preguntaba dónde guardar, no aparecía como descarga y en el celular a
 * veces no quedaba ningún archivo. Ahora pdfmake arma el documento y lo baja.
 *
 * pdfmake y las fuentes se cargan **recién al primer PDF** (`import()` dinámico):
 * pesan más de 1 MB y la mayoría de las visitas no descargan nada. Las fuentes
 * son las de la interfaz (Manrope y Newsreader), servidas desde el mismo sitio:
 * la CSP solo deja `connect-src 'self'` y el backend.
 */

/** Los archivos de fuente, con el nombre que usan los documentos. */
export const ARCHIVOS_DE_FUENTE: Record<string, string> = {
  'manrope-400.woff': manrope400,
  'manrope-600.woff': manrope600,
  'manrope-700.woff': manrope700,
  'manrope-800.woff': manrope800,
  'newsreader-400.woff': newsreader400,
  'newsreader-400-italic.woff': newsreader400i,
};

/**
 * Las familias que pueden usar los documentos. pdfmake solo distingue "bold" o
 * no, así que el semibold de la interfaz (600) es una familia aparte.
 */
export const FAMILIAS: TFontDictionary = {
  Manrope: {
    normal: 'manrope-400.woff',
    bold: 'manrope-700.woff',
    italics: 'manrope-400.woff',
    bolditalics: 'manrope-700.woff',
  },
  ManropeSemibold: {
    normal: 'manrope-600.woff',
    bold: 'manrope-800.woff',
    italics: 'manrope-600.woff',
    bolditalics: 'manrope-800.woff',
  },
  Newsreader: {
    normal: 'newsreader-400.woff',
    bold: 'newsreader-400.woff',
    italics: 'newsreader-400-italic.woff',
    bolditalics: 'newsreader-400-italic.woff',
  },
};

/** El logo de los encabezados: el mismo PNG que usa la web. */
export const LOGO_URL = '/logo-horizontal.png';

/** Cómo se lee un archivo: en el navegador, con `fetch` al mismo sitio. */
export type LeerArchivo = (url: string) => Promise<ArrayBuffer>;

const leerConFetch: LeerArchivo = async (url) => {
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error(`No se pudo cargar ${url}`);
  return respuesta.arrayBuffer();
};

function aBase64(datos: ArrayBuffer): string {
  const bytes = new Uint8Array(datos);
  let binario = '';
  // De a tramos: `String.fromCharCode(...bytes)` de una vez revienta la pila
  // con archivos de cientos de KB.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binario);
}

type PdfMake = typeof import('pdfmake/build/pdfmake');

type Motor = { pdfmake: PdfMake; logo: string };

let motor: Promise<Motor> | null = null;

/**
 * pdfmake con las fuentes y el logo cargados. Se prepara una sola vez; si
 * falla (sin red, por ejemplo), el próximo intento vuelve a empezar.
 */
export function prepararPdf(leer: LeerArchivo = leerConFetch): Promise<Motor> {
  if (!motor) {
    motor = (async () => {
      const [modulo, fuentes, logo] = await Promise.all([
        import('pdfmake/build/pdfmake'),
        Promise.all(
          Object.entries(ARCHIVOS_DE_FUENTE).map(
            async ([nombre, url]) => [nombre, aBase64(await leer(url))] as const,
          ),
        ),
        leer(LOGO_URL),
      ]);
      // Según cómo se empaquete, el módulo llega con o sin `default`.
      const pdfmake = ((modulo as { default?: PdfMake }).default ?? modulo) as PdfMake;
      pdfmake.addVirtualFileSystem(Object.fromEntries(fuentes));
      pdfmake.setFonts(FAMILIAS);
      return { pdfmake, logo: `data:image/png;base64,${aBase64(logo)}` };
    })();
    motor.catch(() => {
      motor = null;
    });
  }
  return motor;
}

/** Arma el PDF con el logo disponible como imagen `logo`. */
export async function crearPdf(doc: TDocumentDefinitions, leer?: LeerArchivo) {
  const { pdfmake, logo } = await prepararPdf(leer);
  return pdfmake.createPdf({ ...doc, images: { logo, ...doc.images } });
}

/** Arma el PDF y lo baja con ese nombre de archivo. */
export async function descargarPdf(doc: TDocumentDefinitions, archivo: string): Promise<void> {
  const pdf = await crearPdf(doc);
  await pdf.download(archivo);
}
