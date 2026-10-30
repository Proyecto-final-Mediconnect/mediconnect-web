import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
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

/**
 * Los datos de emergencia del MediPass (ENG-136): lo que ve un médico que no te
 * conoce cuando escanea tu código. Sin esto, el MediPass sale con el nombre y la
 * edad y nada más, justo en lo que existe para mostrar.
 *
 * Va en el perfil, en su propia tarjeta y con su propio "Guardar": son datos de
 * salud que se cargan de a poco (una alergia nueva, un remedio que se deja), y no
 * tiene sentido atarlos al formulario de los datos personales.
 *
 * `PUT /patients/me/vital` reemplaza el bloque entero, así que borrar una fila y
 * guardar es como se saca una alergia.
 *
 * Se monta recién con el perfil cargado (lo decide la página), así que arranca
 * precargado sin un efecto que lo pise después.
 */
export function VitalInfoForm() {
  const profile = useMyProfile();
  const update = useUpdateVitalInfo();
  const [form, setForm] = useState<VitalForm>(() => toForm(profile.data));
  const [original, setOriginal] = useState(() => JSON.stringify(toForm(profile.data)));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const sucio = JSON.stringify(form) !== original;

  function cambiar(next: VitalForm) {
    setForm(next);
    setSaved(false);
  }

  function guardar(event: React.FormEvent) {
    event.preventDefault();
    const { input, errors: nuevos } = toInput(form);
    setErrors(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    update.mutate(input, {
      onSuccess: (perfil) => {
        const guardado = toForm(perfil);
        setForm(guardado);
        setOriginal(JSON.stringify(guardado));
        setSaved(true);
      },
    });
  }

  return (
    <form
      id="emergencias"
      onSubmit={guardar}
      noValidate
      aria-labelledby="emergencias-titulo"
      className="scroll-mt-24 overflow-hidden rounded-[14px] border border-line bg-white"
    >
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line-soft px-6 py-[18px]">
        <div className="flex gap-3.5">
          <span
            aria-hidden="true"
            className="grid size-10 flex-none place-items-center rounded-full bg-surface-teal text-brand-hover"
          >
            <svg
              viewBox="0 0 20 20"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                d="M10 17s-6-3.6-6-8.4A3.4 3.4 0 0 1 10 6a3.4 3.4 0 0 1 6 2.6C16 13.4 10 17 10 17Z"
                strokeLinejoin="round"
              />
              <path d="M6.5 10h2l1-2 1.5 4 1-2h1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <h2 id="emergencias-titulo" className="text-[17px] font-bold text-brand-deep">
              Para una emergencia
            </h2>
            <p className="mt-1.5 max-w-[560px] text-[13px] leading-[1.6] text-muted">
              Es lo que ve un médico que no te conoce cuando escanea tu MediPass. Cargá lo que te
              puede salvar la vida: alergias, remedios, condiciones y a quién llamar.
            </p>
          </div>
        </div>
        <Link
          to="/medipass"
          className="text-[13px] font-semibold text-brand-hover underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          Ver mi MediPass →
        </Link>
      </header>

      <div className="grid gap-7 px-6 py-6">
        <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
          <label className="grid content-start gap-1.5">
            <span className={ROTULO}>Sexo</span>
            <select
              value={form.sex}
              onChange={(e) => cambiar({ ...form, sex: e.target.value })}
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

          <div className="grid content-start gap-1.5">
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
                    onClick={() => cambiar({ ...form, bloodType: grupo })}
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
        </div>

        <Lista
          titulo="Alergias"
          detalle="A remedios, alimentos o lo que sea. Si te dio una reacción grave, anotala."
          agregar="Agregar alergia"
          cantidad={form.allergies.length}
          onAgregar={() =>
            cambiar({ ...form, allergies: [...form.allergies, { ...EMPTY_ALLERGY }] })
          }
        >
          {form.allergies.map((a, i) => (
            <Fila
              key={i}
              etiqueta={`la alergia ${i + 1}`}
              onQuitar={() =>
                cambiar({ ...form, allergies: form.allergies.filter((_, j) => j !== i) })
              }
            >
              <Campo
                label="A qué"
                value={a.que}
                placeholder="Penicilina"
                error={errors[`allergies.${i}.que`]}
                maxLength={120}
                onChange={(que) =>
                  cambiar({
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
                  cambiar({
                    ...form,
                    allergies: form.allergies.map((x, j) => (j === i ? { ...x, gravedad } : x)),
                  })
                }
              />
            </Fila>
          ))}
        </Lista>

        <Lista
          titulo="Medicación que tomás"
          detalle="Lo que tomás todos los días o de forma crónica, con la dosis si la sabés."
          agregar="Agregar remedio"
          cantidad={form.medications.length}
          onAgregar={() =>
            cambiar({ ...form, medications: [...form.medications, { ...EMPTY_MEDICATION }] })
          }
        >
          {form.medications.map((m, i) => (
            <Fila
              key={i}
              etiqueta={`el remedio ${i + 1}`}
              tres
              onQuitar={() =>
                cambiar({ ...form, medications: form.medications.filter((_, j) => j !== i) })
              }
            >
              <Campo
                label="Remedio"
                value={m.droga}
                placeholder="Enalapril 10 mg"
                error={errors[`medications.${i}.droga`]}
                maxLength={120}
                onChange={(droga) =>
                  cambiar({
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
                  cambiar({
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
                  cambiar({
                    ...form,
                    medications: form.medications.map((x, j) => (j === i ? { ...x, nota } : x)),
                  })
                }
              />
            </Fila>
          ))}
        </Lista>

        <Lista
          titulo="Condiciones"
          detalle="Diagnósticos que un médico tiene que saber: hipertensión, diabetes, asma, marcapasos…"
          agregar="Agregar condición"
          cantidad={form.conditions.length}
          onAgregar={() =>
            cambiar({ ...form, conditions: [...form.conditions, { ...EMPTY_CONDITION }] })
          }
        >
          {form.conditions.map((c, i) => (
            <Fila
              key={i}
              etiqueta={`la condición ${i + 1}`}
              onQuitar={() =>
                cambiar({ ...form, conditions: form.conditions.filter((_, j) => j !== i) })
              }
            >
              <Campo
                label="Condición"
                value={c.nombre}
                placeholder="Hipertensión arterial"
                error={errors[`conditions.${i}.nombre`]}
                maxLength={120}
                onChange={(nombre) =>
                  cambiar({
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
                  cambiar({
                    ...form,
                    conditions: form.conditions.map((x, j) => (j === i ? { ...x, codigo } : x)),
                  })
                }
              />
            </Fila>
          ))}
        </Lista>

        <div className="grid gap-3">
          <div>
            <h3 className="text-[14px] font-bold text-brand-deep">Contacto de emergencia</h3>
            <p className="mt-0.5 text-[13px] text-muted">A quién llamar si no podés hablar.</p>
          </div>
          <div className="grid gap-4 rounded-[12px] bg-surface p-4 sm:grid-cols-3">
            <Campo
              label="Nombre"
              value={form.contact.nombre}
              placeholder="Marina Sosa"
              error={errors['contact.nombre']}
              maxLength={120}
              onChange={(nombre) => cambiar({ ...form, contact: { ...form.contact, nombre } })}
            />
            <Campo
              label="Vínculo"
              value={form.contact.vinculo}
              placeholder="Hermana"
              maxLength={40}
              onChange={(vinculo) => cambiar({ ...form, contact: { ...form.contact, vinculo } })}
            />
            <Campo
              label="Teléfono"
              type="tel"
              value={form.contact.telefono}
              placeholder="+54 351 555 2210"
              error={errors['contact.telefono']}
              maxLength={20}
              onChange={(telefono) => cambiar({ ...form, contact: { ...form.contact, telefono } })}
            />
          </div>
        </div>

        {update.isError && (
          <p
            role="alert"
            className="rounded-[10px] border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
          >
            {update.error.message}
          </p>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-x-5 gap-y-3 border-t border-line-soft bg-surface/60 px-6 py-3.5">
        {(sucio || saved) && (
          <p className="mr-auto flex items-center gap-2 text-[13px] font-medium text-muted">
            <span
              aria-hidden="true"
              className={`size-1.5 flex-none rounded-full ${sucio ? 'bg-brand-bright' : 'bg-brand-hover'}`}
            />
            {sucio ? (
              'Tenés cambios sin guardar.'
            ) : (
              <span role="status" className="font-semibold text-brand-hover">
                Guardado: ya se ve en tu MediPass ✓
              </span>
            )}
          </p>
        )}
        <button
          type="submit"
          disabled={update.isPending || !sucio}
          className="rounded-[9px] bg-brand-deep px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-brand-deep"
        >
          {update.isPending ? 'Guardando…' : 'Guardar datos de emergencia'}
        </button>
      </footer>
    </form>
  );
}

/** Una lista editable: título, para qué sirve, sus filas y el botón de agregar. */
function Lista({
  titulo,
  detalle,
  agregar,
  cantidad,
  onAgregar,
  children,
}: {
  titulo: string;
  detalle: string;
  agregar: string;
  cantidad: number;
  onAgregar: () => void;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3">
      <div>
        <h3 className="text-[14px] font-bold text-brand-deep">{titulo}</h3>
        <p className="mt-0.5 text-[13px] text-muted">{detalle}</p>
      </div>
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

/** Una fila de una lista, en una caja suave con el botón para sacarla. */
function Fila({
  etiqueta,
  tres = false,
  onQuitar,
  children,
}: {
  etiqueta: string;
  tres?: boolean;
  onQuitar: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[12px] bg-surface p-4">
      <div className={`grid flex-1 gap-4 ${tres ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {children}
      </div>
      <button
        type="button"
        onClick={onQuitar}
        aria-label={`Quitar ${etiqueta}`}
        className="mt-6 grid size-8 flex-none place-items-center rounded-full text-muted transition-colors hover:bg-danger/10 hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  maxLength?: number;
  type?: string;
}) {
  return (
    <label className="grid content-start gap-1.5">
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
