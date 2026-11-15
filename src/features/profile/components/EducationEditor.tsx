import { MAX_EDUCATION, type EducationDraft } from '../types/professionalProfile';

const CAMPO =
  'w-full rounded-[10px] border border-line-strong bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted-soft focus:border-brand focus-visible:ring-2 focus-visible:ring-brand';

/**
 * La formación del perfil público: una fila por título, con institución, título
 * y año (opcional). Es lo que el perfil del catálogo muestra en "Formación", y
 * hasta acá solo la cargaba la seed: el profesional no tenía dónde editarla.
 *
 * Controlado desde el formulario: se guarda con el resto del perfil.
 */
export function EducationEditor({
  rows,
  onChange,
  error,
}: {
  rows: EducationDraft[];
  onChange: (rows: EducationDraft[]) => void;
  error?: string;
}) {
  function update(uid: string, patch: Partial<EducationDraft>) {
    onChange(rows.map((row) => (row.uid === uid ? { ...row, ...patch } : row)));
  }

  function add() {
    onChange([...rows, { uid: crypto.randomUUID(), institution: '', degree: '', year: '' }]);
  }

  return (
    <div className="grid gap-3">
      {rows.length === 0 && (
        <p className="text-sm text-muted">Todavía no cargaste ningún título.</p>
      )}

      {rows.map((row, index) => (
        <fieldset
          key={row.uid}
          className="grid gap-2.5 rounded-[10px] border border-line-soft bg-surface px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_96px_auto] sm:items-end"
        >
          <legend className="sr-only">Título {index + 1}</legend>
          <label className="text-[13px]">
            <span className="mb-1 block font-semibold text-muted">Título</span>
            <input
              value={row.degree}
              onChange={(e) => update(row.uid, { degree: e.target.value })}
              placeholder="Medicina"
              maxLength={150}
              className={CAMPO}
            />
          </label>
          <label className="text-[13px]">
            <span className="mb-1 block font-semibold text-muted">Institución</span>
            <input
              value={row.institution}
              onChange={(e) => update(row.uid, { institution: e.target.value })}
              placeholder="Universidad Nacional de Córdoba"
              maxLength={150}
              className={CAMPO}
            />
          </label>
          <label className="text-[13px]">
            <span className="mb-1 block font-semibold text-muted">Año</span>
            <input
              value={row.year}
              onChange={(e) => update(row.uid, { year: e.target.value.replace(/\D/g, '') })}
              inputMode="numeric"
              maxLength={4}
              placeholder="2015"
              className={CAMPO}
            />
          </label>
          <button
            type="button"
            onClick={() => onChange(rows.filter((r) => r.uid !== row.uid))}
            aria-label={`Quitar el título ${index + 1}`}
            className="justify-self-start rounded-[8px] px-3 py-2.5 text-[13px] font-semibold text-danger transition-colors hover:bg-danger/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Quitar
          </button>
        </fieldset>
      ))}

      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}

      {rows.length < MAX_EDUCATION ? (
        <button
          type="button"
          onClick={add}
          className="justify-self-start text-sm font-semibold text-brand-hover hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          + Agregar título
        </button>
      ) : (
        <p className="text-[13px] text-muted">Podés cargar hasta {MAX_EDUCATION} títulos.</p>
      )}
    </div>
  );
}
