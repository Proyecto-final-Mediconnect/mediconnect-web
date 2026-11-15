import { useCallback, useEffect, useState } from 'react';

/**
 * Reportes exportables a PDF ("Mi actividad" y "Tu resumen").
 *
 * Mismo enfoque que la historia clínica y la tarjeta de emergencia (#114): no hay
 * endpoint de exportación, el navegador imprime a PDF. Lo que cambia es qué se
 * imprime: una hoja pensada para papel (`.hoja-reporte`, un portal en `body`) y
 * no el panel, que tiene botones, enlaces y un layout de pantalla.
 *
 * La hoja se monta **solo mientras se imprime**. Si quedara montada, la regla de
 * `index.css` que oculta el resto de la app al imprimir se aplicaría también a
 * cualquier otra impresión de la misma página.
 */
export function usePrintReport() {
  const [imprimiendo, setImprimiendo] = useState(false);

  useEffect(() => {
    if (!imprimiendo) return;
    const terminar = () => setImprimiendo(false);
    window.addEventListener('afterprint', terminar);
    // Un tick para que el portal ya esté en el DOM cuando se abre el diálogo.
    const id = window.setTimeout(() => window.print(), 0);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('afterprint', terminar);
    };
  }, [imprimiendo]);

  // Si un navegador no avisó `afterprint`, la hoja sigue montada (invisible en
  // pantalla): un segundo clic imprime directo en lugar de no hacer nada.
  const imprimir = useCallback(() => {
    if (imprimiendo) window.print();
    else setImprimiendo(true);
  }, [imprimiendo]);

  return { imprimiendo, imprimir };
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
