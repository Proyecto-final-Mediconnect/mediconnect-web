import { useState } from 'react';
import { FILTROS_VACIOS, hayFiltros, type FiltrosHC } from '../lib/filtrarEntradas';
import { ENTRY_TYPE_LABELS } from '../types/clinicalRecord';
import { TONO_TIPO } from '../lib/entryTone';

/**
 * Búsqueda y filtros de la historia clínica (pantalla "Historia clínica" del
 * canvas).
 *
 * Un solo componente para los dos anchos, cambiando el armado con CSS:
 *
 * - **En pantallas anchas** es una columna fija al costado de la cadena, con
 *   todo a la vista: aprovecha el ancho de un monitor y queda a mano mientras
 *   se recorre una historia larga.
 * - **En pantallas angostas** se vuelve una barra arriba: buscar y el tipo a la
 *   vista, y el resto detrás de "Más filtros".
 *
 * Filtrar es local: no vuelve a pedir la historia. Cada lectura de la HC deja
 * una fila en la auditoría (Ley 26.529), y filtrar no es un acceso nuevo.
 */
export function RecordFilters({
  filtros,
  onChange,
  tipos,
  profesionales,
  total,
  visibles,
  onDescargar,
}: {
  filtros: FiltrosHC;
  onChange: (filtros: FiltrosHC) => void;
  tipos: string[];
  profesionales: string[];
  total: number;
  visibles: number;
  onDescargar: () => void;
}) {
  const [masFiltros, setMasFiltros] = useState(false);
  const set = <K extends keyof FiltrosHC>(key: K, value: FiltrosHC[K]) =>
    onChange({ ...filtros, [key]: value });
  const activo = hayFiltros(filtros);
  const extrasActivos =
    !!filtros.profesional || !!filtros.desde || !!filtros.hasta || filtros.soloCorrecciones;
  const contador = activo ? `${visibles} de ${total} registros` : `${total} registros`;

  return (
    <aside
      aria-label="Filtros"
      className="grid gap-3 print:hidden lg:sticky lg:top-6 lg:gap-5 lg:rounded-[16px] lg:border lg:border-line lg:bg-white lg:p-5"
    >
      <div className="hidden lg:block">
        <h2 className="text-[15px] font-bold text-brand-deep">Filtros</h2>
        <p className="mt-0.5 text-[13px] text-muted">{contador}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 lg:grid">
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">Buscar en la historia clínica</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-soft"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="9" cy="9" r="6" />
            <path d="m14 14 4 4" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={filtros.busqueda}
            onChange={(e) => set('busqueda', e.target.value)}
            placeholder="Diagnóstico, remedio, profesional…"
            className="w-full rounded-full border border-line-strong bg-white py-2 pl-10 pr-4 text-sm text-ink placeholder:text-muted-soft focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
        </label>

        <button
          type="button"
          aria-expanded={masFiltros}
          onClick={() => setMasFiltros((v) => !v)}
          className={`${PILDORA} lg:hidden ${extrasActivos ? 'border-brand bg-surface-teal' : ''}`}
        >
          Más filtros
        </button>
      </div>

      {/* Solo si hay más de una opción: un filtro con un único valor no filtra
          nada y ocupa lo mismo. */}
      {tipos.length > 1 && (
        <div className="grid gap-2">
          <span className={`${ROTULO} hidden lg:block`}>Tipo de registro</span>
          <div role="radiogroup" aria-label="Tipo de registro" className="flex flex-wrap gap-2">
            {['', ...tipos].map((tipo) => {
              const elegido = filtros.tipo === tipo;
              return (
                <button
                  key={tipo || 'todos'}
                  type="button"
                  role="radio"
                  aria-checked={elegido}
                  onClick={() => set('tipo', tipo)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                    elegido
                      ? 'bg-brand-deep text-white'
                      : 'bg-white text-brand-deep ring-1 ring-line-strong hover:ring-brand'
                  }`}
                >
                  {tipo && (
                    <span
                      aria-hidden="true"
                      className={`size-1.5 rounded-full ${elegido ? 'bg-white' : (TONO_TIPO[tipo]?.dot ?? 'bg-brand')}`}
                    />
                  )}
                  {tipo ? (PLURALES[tipo] ?? ENTRY_TYPE_LABELS[tipo] ?? tipo) : 'Todo'}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* En angosto se abre con "Más filtros" (o queda abierto si hay alguno
          puesto, para que se vea qué está filtrando); en ancho, siempre. */}
      <div className={`${masFiltros || extrasActivos ? 'grid' : 'hidden'} gap-4 lg:grid`}>
        {profesionales.length > 1 && (
          <label className="grid gap-1.5">
            <span className={ROTULO}>Profesional</span>
            <select
              value={filtros.profesional}
              onChange={(e) => set('profesional', e.target.value)}
              className={CAMPO}
            >
              <option value="">Todos</option>
              {profesionales.map((nombre) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
          <label className="grid gap-1.5">
            <span className={ROTULO}>Desde</span>
            <input
              type="date"
              value={filtros.desde}
              onChange={(e) => set('desde', e.target.value)}
              className={CAMPO}
            />
          </label>
          <label className="grid gap-1.5">
            <span className={ROTULO}>Hasta</span>
            <input
              type="date"
              value={filtros.hasta}
              onChange={(e) => set('hasta', e.target.value)}
              className={CAMPO}
            />
          </label>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={filtros.soloCorrecciones}
            onChange={(e) => set('soloCorrecciones', e.target.checked)}
            className="size-4 accent-brand"
          />
          Solo registros corregidos
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:grid lg:border-t lg:border-line-soft lg:pt-5">
        <span className="text-[13px] text-muted lg:hidden">{contador}</span>
        {activo && (
          <button
            type="button"
            onClick={() => onChange(FILTROS_VACIOS)}
            className="text-[13px] font-semibold text-brand-deep underline underline-offset-2 hover:text-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:justify-self-start"
          >
            Limpiar filtros
          </button>
        )}
        {/* No hay endpoint de exportación: es la impresión del navegador, que
            ofrece "Guardar como PDF". Baja lo que se está viendo, filtros
            incluidos, y el encabezado impreso lo aclara. */}
        <button
          type="button"
          onClick={onDescargar}
          aria-label="Descargar historia en PDF"
          className={`${PILDORA} ml-auto inline-flex items-center justify-center gap-2 lg:ml-0 lg:w-full`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              d="M10 3v9m0 0-3.5-3.5M10 12l3.5-3.5M4 15h12"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Descargar PDF
        </button>
      </div>
    </aside>
  );
}

const PLURALES: Record<string, string> = {
  CONSULTA: 'Consultas',
  DIAGNOSTICO: 'Diagnósticos',
  PRESCRIPCION: 'Prescripciones',
  ESTUDIO: 'Estudios',
  CORRECCION: 'Correcciones',
};

const PILDORA =
  'rounded-full border border-line-strong bg-white px-3.5 py-2 text-sm font-semibold text-brand-deep transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand';
const CAMPO =
  'w-full rounded-[9px] border border-line-strong bg-white px-2.5 py-2 text-[13px] font-medium text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30';
const ROTULO = 'text-[11px] font-semibold uppercase tracking-[0.1em] text-muted';
