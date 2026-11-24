import { useCallback, useRef, useState } from 'react';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { descargarPdf } from './pdf';

/** Lo que arma cada pantalla: el documento y con qué nombre se baja. */
export type PdfParaDescargar = { doc: TDocumentDefinitions; archivo: string };

const ERROR_GENERICO = 'No pudimos generar el PDF. Probá de nuevo.';

/**
 * Baja un PDF armado en el navegador (ENG-231) y dice si está generando o si
 * falló, para el botón.
 *
 * `armar` puede ser asíncrono: la historia clínica primero registra la descarga
 * en el backend, y si eso falla no se genera nada y se muestra su mensaje.
 */
export function useDescargaPdf() {
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Un doble clic no arma dos PDF: el estado de React llega un render tarde.
  const enCurso = useRef(false);

  const descargar = useCallback(
    async (armar: () => PdfParaDescargar | Promise<PdfParaDescargar>) => {
      if (enCurso.current) return;
      enCurso.current = true;
      setGenerando(true);
      setError(null);
      try {
        const { doc, archivo } = await armar();
        await descargarPdf(doc, archivo);
      } catch (e) {
        // Un error del backend trae un mensaje para la persona; el resto no.
        const status = (e as { status?: unknown } | null)?.status;
        setError(typeof status === 'number' && e instanceof Error ? e.message : ERROR_GENERICO);
      } finally {
        enCurso.current = false;
        setGenerando(false);
      }
    },
    [],
  );

  return { generando, error, descargar };
}
