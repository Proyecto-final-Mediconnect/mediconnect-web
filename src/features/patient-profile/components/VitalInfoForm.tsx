import { useState, type ReactNode } from 'react';
import { useMyProfile, useUpdateVitalInfo } from '../hooks/usePatientProfile';
import {
  EMPTY_ALLERGY,
  EMPTY_CONDITION,
  EMPTY_MEDICATION,
  MAX_ROWS,
  toForm,
  toInput,
  type VitalForm,
} from '../lib/vitalInfo';
import { BLOOD_TYPES, SEXES } from '../types/patientProfile';

/** Lo que se edita de a una vez: cada bloque del MediPass tiene su propio panel. */
export type VitalSection = 'basicos' | 'alergias' | 'medicacion' | 'condiciones' | 'contacto';

/**
 * Edita un bloque de los datos de emergencia del MediPass (ENG-136): lo que ve un
 * médico que no te conoce cuando escanea tu código.
 *
 * Se abre desde el MediPass, en un panel lateral y de a un bloque: son datos que
 * se cargan de a poco (una alergia nueva, un remedio que se deja), y un formulario
 * con todo junto quedaba larguísimo en el perfil.
 *
 * `PUT /patients/me/vital` reemplaza el bloque entero, así que se manda todo lo
 * guardado más lo que cambió en esta sección. Borrar una fila y guardar es como
 * se saca una alergia.
 *
 * Se monta recién con el perfil cargado (lo decide quien lo abre), así que
 * arranca precargado sin un efecto que lo pise después.
 */
export function VitalInfoForm({
  seccion,
  onDone,
}: {
  seccion: VitalSection;
  /** Se guardó o se canceló: quien lo abrió cierra el panel. */
  onDone: (guardado: boolean) => void;
}) {
  const profile = useMyProfile();
  const update = useUpdateVitalInfo();
  // Una lista vacía arranca con una fila, para escribir sin tener que tocar
  // "Agregar" primero. Las filas vacías no se mandan.
  const [inicial] = useState<VitalForm>(() => conFilaVacia(toForm(profile.data), seccion));
  const [form, setForm] = useState<VitalForm>(inicial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sucio = JSON.stringify(form) !== JSON.stringify(inicial);

  function guardar(event: React.FormEvent) {
    event.preventDefault();
    const { input, errors: nuevos } = toInput(form);
    setErrors(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    update.mutate(input, { onSuccess: () => onDone(true) });
  }

  return (
    <form onSubmit={guardar} noValidate className="flex min-h-full flex-col gap-4">
      <p className="px-1 text-[13px] leading-[1.6] text-muted">{AYUDA[seccion]}</p>

      <div className="grid gap-5 rounded-[14px] border border-line bg-white p-4">
        {seccion === 'basicos' && (
          <>
            <div className="grid gap-2">
              <span id="grupo" className={ROTULO}>
                Grupo sanguíneo
              </span>
              <div role="radiogroup" aria-labelledby="grupo" className="flex flex-wrap gap-2">
                {['', ...BLOOD_TYPES].map((grupo) => {
                  const elegido = form.bloodType === grupo;
                  return (
                    <button
                      key={grupo || 'no-se'}
                      type="button"
                      role="radio"
                      aria-checked={elegido}
                      onClick={() => setForm({ ...form, bloodType: grupo })}
                      className={`min-w-[52px] rounded-full px-3.5 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                        elegido
                          ? 'bg-brand-deep text-white'
                          : 'bg-white text-brand-deep ring-1 ring-line-strong hover:ring-brand'
                      }`}
                    >
                      {grupo || 'No sé'}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="grid gap-1.5">
              <span className={ROTULO}>Sexo</span>
              <select
                value={form.sex}
                onChange={(e) => setForm({ ...form, sex: e.target.value })}
                className={CAMPO}
              >
                <option value="">Sin indicar</option>
                {SEXES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        {seccion === 'alergias' && (
          <Lista
            agregar="Agregar otra alergia"
            cantidad={form.allergies.length}
            onAgregar={() =>
              setForm({ ...form, allergies: [...form.allergies, { ...EMPTY_ALLERGY }] })
            }
          >
            {form.allergies.map((a, i) => (
              <Fila
                key={i}
                etiqueta={`la alergia ${i + 1}`}
                onQuitar={() =>
                  setForm({ ...form, allergies: form.allergies.filter((_, j) => j !== i) })
                }
              >
                <Campo
                  label="A qué"
                  value={a.que}
                  placeholder="Penicilina"
                  error={errors[`allergies.${i}.que`]}
                  maxLength={120}
                  onChange={(que) =>
                    setForm({
                      ...form,
                      allergies: form.allergies.map((x, j) => (j === i ? { ...x, que } : x)),
                    })
                  }
                />
                <Campo
                  label="Qué te pasa"
                  value={a.gravedad}
                  placeholder="Anafilaxia"
                  maxLength={60}
                  onChange={(gravedad) =>
                    setForm({
                      ...form,
                      allergies: form.allergies.map((x, j) => (j === i ? { ...x, gravedad } : x)),
                    })
                  }
                />
              </Fila>
            ))}
          </Lista>
        )}

        {seccion === 'medicacion' && (
          <Lista
            agregar="Agregar otro remedio"
            cantidad={form.medications.length}
            onAgregar={() =>
              setForm({ ...form, medications: [...form.medications, { ...EMPTY_MEDICATION }] })
            }
          >
            {form.medications.map((m, i) => (
              <Fila
                key={i}
                etiqueta={`el remedio ${i + 1}`}
                onQuitar={() =>
                  setForm({ ...form, medications: form.medications.filter((_, j) => j !== i) })
                }
              >
                <Campo
                  ancho
                  label="Remedio"
                  value={m.droga}
                  placeholder="Enalapril 10 mg"
                  error={errors[`medications.${i}.droga`]}
                  maxLength={120}
                  onChange={(droga) =>
                    setForm({
                      ...form,
                      medications: form.medications.map((x, j) => (j === i ? { ...x, droga } : x)),
                    })
                  }
                />
                <Campo
                  label="Dosis"
                  value={m.dosis}
                  placeholder="Una vez por día"
                  maxLength={60}
                  onChange={(dosis) =>
                    setForm({
                      ...form,
                      medications: form.medications.map((x, j) => (j === i ? { ...x, dosis } : x)),
                    })
                  }
                />
                <Campo
                  label="Nota"
                  value={m.nota}
                  placeholder="Opcional"
                  maxLength={200}
                  onChange={(nota) =>
                    setForm({
                      ...form,
                      medications: form.medications.map((x, j) => (j === i ? { ...x, nota } : x)),
                    })
                  }
                />
              </Fila>
            ))}
          </Lista>
        )}

        {seccion === 'condiciones' && (
          <Lista
            agregar="Agregar otra condición"
            cantidad={form.conditions.length}
            onAgregar={() =>
              setForm({ ...form, conditions: [...form.conditions, { ...EMPTY_CONDITION }] })
            }
          >
            {form.conditions.map((c, i) => (
              <Fila
                key={i}
                etiqueta={`la condición ${i + 1}`}
                onQuitar={() =>
                  setForm({ ...form, conditions: form.conditions.filter((_, j) => j !== i) })
                }
              >
                <Campo
                  label="Condición"
                  value={c.nombre}
                  placeholder="Hipertensión arterial"
                  error={errors[`conditions.${i}.nombre`]}
                  maxLength={120}
                  onChange={(nombre) =>
                    setForm({
                      ...form,
                      conditions: form.conditions.map((x, j) => (j === i ? { ...x, nombre } : x)),
                    })
                  }
                />
                <Campo
                  label="Código (opcional)"
                  value={c.codigo}
                  placeholder="CIE-10 I10"
                  maxLength={30}
                  onChange={(codigo) =>
                    setForm({
                      ...form,
                      conditions: form.conditions.map((x, j) => (j === i ? { ...x, codigo } : x)),
                    })
                  }
                />
              </Fila>
            ))}
          </Lista>
        )}

        {seccion === 'contacto' && (
          <div className="grid grid-cols-2 gap-3">
            <Campo
              ancho
              label="Nombre"
              value={form.contact.nombre}
              placeholder="Marina Sosa"
              error={errors['contact.nombre']}
              maxLength={120}
              onChange={(nombre) => setForm({ ...form, contact: { ...form.contact, nombre } })}
            />
            <Campo
              label="Vínculo"
              value={form.contact.vinculo}
              placeholder="Hermana"
              maxLength={40}
              onChange={(vinculo) => setForm({ ...form, contact: { ...form.contact, vinculo } })}
            />
            <Campo
              label="Teléfono"
              type="tel"
              value={form.contact.telefono}
              placeholder="+54 351 555 2210"
              error={errors['contact.telefono']}
              maxLength={20}
              onChange={(telefono) => setForm({ ...form, contact: { ...form.contact, telefono } })}
            />
          </div>
        )}
      </div>

      {update.isError && (
        <p
          role="alert"
          className="rounded-[10px] border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {update.error.message}
        </p>
      )}

      {/* Pegado abajo del panel: con varias filas, el botón no se va de la vista. */}
      <footer className="sticky bottom-0 -mx-4 -mb-4 mt-auto flex items-center justify-end gap-3 border-t border-line bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => onDone(false)}
          className="rounded-[9px] px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-line-soft hover:text-brand-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={update.isPending || !sucio}
          className="rounded-[9px] bg-brand-deep px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-brand-deep"
        >
          {update.isPending ? 'Guardando…' : 'Guardar'}
        </button>
      </footer>
    </form>
  );
}

/** Para qué sirve cada bloque, dicho como lo usaría un médico de guardia. */
const AYUDA: Record<VitalSection, string> = {
  basicos: 'El grupo sanguíneo es lo primero que se busca si hace falta una transfusión.',
  alergias: 'A remedios, alimentos o lo que sea. Si alguna vez te dio una reacción grave, anotala.',
  medicacion: 'Lo que tomás todos los días o de forma crónica, con la dosis si la sabés.',
  condiciones:
    'Diagnósticos que un médico tiene que saber: hipertensión, diabetes, asma, marcapasos…',
  contacto: 'A quién llamar si no podés hablar.',
};

function conFilaVacia(form: VitalForm, seccion: VitalSection): VitalForm {
  if (seccion === 'alergias' && !form.allergies.length)
    return { ...form, allergies: [{ ...EMPTY_ALLERGY }] };
  if (seccion === 'medicacion' && !form.medications.length)
    return { ...form, medications: [{ ...EMPTY_MEDICATION }] };
  if (seccion === 'condiciones' && !form.conditions.length)
    return { ...form, conditions: [{ ...EMPTY_CONDITION }] };
  return form;
}

/** Las filas de una lista y el botón de agregar otra. */
function Lista({
  agregar,
  cantidad,
  onAgregar,
  children,
}: {
  agregar: string;
  cantidad: number;
  onAgregar: () => void;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3">
      {cantidad > 0 && <div className="grid gap-2.5">{children}</div>}
      {cantidad < MAX_ROWS && (
        <button
          type="button"
          onClick={onAgregar}
          className="inline-flex items-center gap-2 justify-self-start rounded-full border border-dashed border-line-strong px-4 py-2 text-[13px] font-semibold text-brand-deep transition-colors hover:border-brand hover:bg-surface-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <span aria-hidden="true" className="text-[15px] leading-none">
            +
          </span>
          {agregar}
        </button>
      )}
    </div>
  );
}

/** Una fila de una lista, en una caja suave con la ✕ para sacarla arriba a la derecha. */
function Fila({
  etiqueta,
  onQuitar,
  children,
}: {
  etiqueta: string;
  onQuitar: () => void;
  children: ReactNode;
}) {
  return (
    <div className="relative rounded-[12px] bg-surface p-3.5 pr-11">
      <div className="grid grid-cols-2 gap-3">{children}</div>
      <button
        type="button"
        onClick={onQuitar}
        aria-label={`Quitar ${etiqueta}`}
        className="absolute right-2 top-2 grid size-8 place-items-center rounded-full text-muted transition-colors hover:bg-danger/10 hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  error,
  placeholder,
  maxLength,
  type = 'text',
  ancho = false,
}: {
  /** Ocupa las dos columnas de la fila. */
  ancho?: boolean;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  maxLength?: number;
  type?: string;
}) {
  return (
    <label className={`grid min-w-0 content-start gap-1.5 ${ancho ? 'col-span-2' : ''}`}>
      <span className={ROTULO}>{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={!!error}
        className={`${CAMPO} ${error ? 'border-danger' : ''}`}
      />
      {error && <span className="text-[12px] text-danger">{error}</span>}
    </label>
  );
}

const ROTULO = 'text-[11px] font-semibold uppercase tracking-[0.1em] text-muted';
const CAMPO =
  'w-full rounded-[10px] border border-line-strong bg-white px-3.5 py-2.5 text-[14px] font-medium text-ink outline-none transition-colors placeholder:font-normal placeholder:text-muted-soft focus:border-brand focus:ring-2 focus:ring-brand/25';
