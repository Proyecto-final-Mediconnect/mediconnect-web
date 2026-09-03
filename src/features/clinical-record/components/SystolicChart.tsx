import { useId, useState } from 'react';
import type { VitalReading } from '../lib/mockClinicalRecord';

/**
 * Presión sistólica de los últimos controles (pantalla de ficha del canvas).
 *
 * Una sola serie sobre un solo eje: es una medida en el tiempo, no una
 * comparación entre categorías. Por eso no lleva leyenda —el título ya nombra la
 * serie— y no hay una paleta categórica que validar.
 *
 * **El objetivo clínico se dibuja como línea de referencia y además se escribe.**
 * Un valor "alto" sin la línea de corte no dice nada, y la línea sin su rótulo
 * queda en 2.5:1 de contraste, por debajo del mínimo: el texto es lo que la hace
 * legible. Los controles por encima del objetivo se marcan en rojo **y** se
 * cuentan en palabras abajo, porque el color no puede ser el único que lo diga.
 *
 * La tabla de al lado no es decorativa: es la vista accesible de los mismos
 * datos, para lector de pantalla y para cuando el gráfico no se puede ver.
 */

type SystolicChartProps = {
  readings: VitalReading[];
  /** Umbral clínico. Por encima de esto el control queda marcado. */
  objetivo: number;
};

/** Caja de dibujo. El SVG escala solo; estas son unidades internas. */
const W = 560;
const H = 180;
const PAD = { top: 18, right: 16, bottom: 26, left: 38 };

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** `2026-08-20` → `20 ago`. */
function corto(fecha: string): string {
  const [, mes, dia] = fecha.split('-').map(Number);
  return `${dia} ${MESES[mes - 1]}`;
}

export function SystolicChart({ readings, objetivo }: SystolicChartProps) {
  const [activo, setActivo] = useState<number | null>(null);
  const gradienteId = useId();

  const valores = readings.map((r) => r.sistolica);
  // La escala arranca debajo del mínimo y del objetivo: si el objetivo quedara
  // fuera del área dibujada, la línea de corte no se vería.
  const min = Math.min(...valores, objetivo) - 8;
  const max = Math.max(...valores, objetivo) + 8;

  const x = (i: number) =>
    PAD.left + (i * (W - PAD.left - PAD.right)) / Math.max(1, readings.length - 1);
  const y = (valor: number) =>
    PAD.top + ((max - valor) * (H - PAD.top - PAD.bottom)) / (max - min);

  const linea = readings.map((r, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(r.sistolica)}`).join(' ');
  const area = `${linea} L ${x(readings.length - 1)} ${H - PAD.bottom} L ${x(0)} ${H - PAD.bottom} Z`;

  const porEncima = readings.filter((r) => r.sistolica > objetivo).length;
  const ultima = readings[readings.length - 1];
  const punto = activo === null ? null : readings[activo];

  return (
    <div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label={`Presión sistólica de los últimos ${readings.length} controles. La tabla siguiente tiene los mismos datos.`}
        >
          <defs>
            <linearGradient id={gradienteId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0b4f6c" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#0b4f6c" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grilla al fondo y en gris claro: ubica sin competir con la serie. */}
          {[min, objetivo, max].map((valor) => (
            <line
              key={valor}
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(valor)}
              y2={y(valor)}
              stroke="#eef3f5"
              strokeWidth="1"
            />
          ))}

          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(objetivo)}
            y2={y(objetivo)}
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
          <text x={PAD.left} y={y(objetivo) - 6} fill="#64748b" fontSize="10" fontWeight="600">
            Objetivo {objetivo}
          </text>

          <path d={area} fill={`url(#${gradienteId})`} />
          <path d={linea} fill="none" stroke="#0b4f6c" strokeWidth="2" strokeLinejoin="round" />

          {readings.map((r, i) => {
            const alto = r.sistolica > objetivo;
            const esUltimo = i === readings.length - 1;

            return (
              <g key={r.fecha}>
                {/* Zona de contacto más grande que el punto: 4px de radio es
                    imposible de apuntar con el mouse y peor con el dedo. */}
                <circle
                  cx={x(i)}
                  cy={y(r.sistolica)}
                  r="14"
                  fill="transparent"
                  onMouseEnter={() => setActivo(i)}
                  onMouseLeave={() => setActivo(null)}
                />
                <circle
                  cx={x(i)}
                  cy={y(r.sistolica)}
                  r={esUltimo || activo === i ? 5 : 4}
                  fill={alto ? '#d64562' : '#0b4f6c'}
                  stroke="#ffffff"
                  strokeWidth="2"
                  pointerEvents="none"
                />
              </g>
            );
          })}

          {/* Solo el primero y el último llevan fecha: ocho rótulos se pisan. */}
          <text x={PAD.left} y={H - 8} fill="#94a3b8" fontSize="10">
            {corto(readings[0].fecha)}
          </text>
          <text x={W - PAD.right} y={H - 8} fill="#94a3b8" fontSize="10" textAnchor="end">
            {corto(ultima.fecha)}
          </text>
        </svg>

        {punto && (
          <p className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-[8px] bg-night px-3 py-1.5 text-[12px] font-semibold text-white">
            {corto(punto.fecha)} · {punto.sistolica}/{punto.diastolica} mmHg
          </p>
        )}
      </div>

      <p className="mt-3 text-[13px] leading-[1.6] text-muted">
        <strong className="font-bold text-brand-deep">
          {porEncima} de {readings.length}
        </strong>{' '}
        controles por encima del objetivo. El último fue {ultima.sistolica}/{ultima.diastolica}{' '}
        mmHg.
      </p>

      {/* Los mismos números, para lector de pantalla y para quien no distingue
          los puntos rojos de los azules. */}
      <details className="mt-3">
        <summary className="cursor-pointer text-[12px] font-semibold text-brand-hover">
          Ver los valores
        </summary>
        <table className="mt-2 w-full text-[12px]">
          <caption className="sr-only">Presión arterial por control</caption>
          <thead>
            <tr className="text-left text-muted-soft">
              <th scope="col" className="py-1 font-semibold">
                Fecha
              </th>
              <th scope="col" className="py-1 font-semibold">
                Presión
              </th>
              <th scope="col" className="py-1 font-semibold">
                Objetivo
              </th>
            </tr>
          </thead>
          <tbody className="text-ink">
            {readings.map((r) => (
              <tr key={r.fecha} className="border-t border-line-soft">
                <td className="py-1">{corto(r.fecha)}</td>
                <td className="py-1 tabular-nums">
                  {r.sistolica}/{r.diastolica} mmHg
                </td>
                <td className="py-1">
                  {r.sistolica > objetivo ? 'Por encima' : 'En objetivo'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
