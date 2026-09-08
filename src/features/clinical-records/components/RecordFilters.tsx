import { ENTRY_TYPE_LABELS } from '../types/clinicalRecord';
import type { FiltrosHC } from '../lib/filtrarEntradas';

/**
 * Panel de filtros de la historia clínica (aside del canvas).
 *
 * Se ofrecen solo los filtros que se pueden cumplir con lo que el backend
 * devuelve. El canvas incluye además "Con estudios adjuntos" y "Descargar
 * historia en PDF": no hay adjuntos en el modelo ni endpoint de exportación, así
 * que ponerlos sería un control que no hace nada.
 */

const CAMPO =
  'w-full rounded-[9px] border border-line-strong bg-white px-3.5 py-[11px] text-sm font-medium text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30';
const ROTULO =
  'text-[11px] font-semibold uppercase tracking-[0.1em] text-muted';

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
  const set = <K extends keyof FiltrosHC>(key: K, value: FiltrosHC[K]) =>
    onChange({ ...filtros, [key]: value });

  const activo =
    !!filtros.tipo ||
    !!filtros.profesional ||
    !!filtros.desde ||
    !!filtros.hasta ||
    filtros.soloCorrecciones;

  return (
    <aside className="overflow-hidden rounded-[14px] border border-line bg-white print:hidden lg:sticky lg:top-6">
      <div className="border-b border-line-soft px-[22px] py-[18px]">
        <h2 className="text-base font-bold text-brand-deep">Filtros</h2>
        <p className="mt-1 text-xs text-muted">
          {activo ? `${visibles} de ${total} entradas` : `${total} entradas`}
        </p>
      </div>

      <div className="grid gap-[18px] px-[22px] py-[18px]">
        <div className="grid gap-2.5">
          <label htmlFor="filtro-desde" className={ROTULO}>
            Desde
          </label>
          <input
            id="filtro-desde"
            type="date"
            value={filtros.desde}
            onChange={(e) => set('desde', e.target.value)}
            className={CAMPO}
          />
        </div>

        <div className="grid gap-2.5">
          <label htmlFor="filtro-hasta" className={ROTULO}>
            Hasta
          </label>
          <input
            id="filtro-hasta"
            type="date"
            value={filtros.hasta}
            onChange={(e) => set('hasta', e.target.value)}
            className={CAMPO}
          />
        </div>

        {/* Solo se ofrece si hay más de una opción: un desplegable con un único
            valor no filtra nada y ocupa lo mismo. */}
        {tipos.length > 1 && (
          <div className="grid gap-2.5">
            <label htmlFor="filtro-tipo" className={ROTULO}>
              Tipo de registro
            </label>
            <select
              id="filtro-tipo"
              value={filtros.tipo}
              onChange={(e) => set('tipo', e.target.value)}
              className={CAMPO}
            >
              <option value="">Todos</option>
              {tipos.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {ENTRY_TYPE_LABELS[tipo] ?? tipo}
                </option>
              ))}
            </select>
          </div>
        )}

        {profesionales.length > 1 && (
          <div className="grid gap-2.5">
            <label htmlFor="filtro-profesional" className={ROTULO}>
              Profesional
            </label>
            <select
              id="filtro-profesional"
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
          </div>
        )}

        <div className="h-px bg-line-soft" />

        <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={filtros.soloCorrecciones}
            onChange={(e) => set('soloCorrecciones', e.target.checked)}
            className="h-[17px] w-[17px] rounded-[4px] accent-brand-deep"
          />
          Solo entradas con correcciones
        </label>

        {/* Descarga el PDF con la impresión del navegador: no hay endpoint de
            exportación, y no hace falta uno. La hoja impresa se define en
            `index.css`, sale sin la barra del panel ni este mismo panel, y el
            navegador ofrece "Guardar como PDF" en el mismo diálogo.

            Baja lo que estás viendo, filtros incluidos, y el encabezado impreso
            lo aclara cuando hay alguno puesto. */}
        <button
          type="button"
          onClick={onDescargar}
          className="rounded-[9px] border border-line-strong bg-white py-3 text-[13px] font-bold text-brand-deep transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          Descargar historia en PDF
        </button>

        {activo && (
          <button
            type="button"
            onClick={() =>
              onChange({
                tipo: '',
                profesional: '',
                desde: '',
                hasta: '',
                soloCorrecciones: false,
              })
            }
            className="rounded-[9px] border border-line-strong bg-white py-3 text-[13px] font-bold text-brand-deep transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </aside>
  );
}
