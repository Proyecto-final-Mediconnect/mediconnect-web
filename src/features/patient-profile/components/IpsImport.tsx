import { useId, useState, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { previewIps } from '../api/previewIps';
import { useMyProfile, useUpdateVitalInfo } from '../hooks/usePatientProfile';
import {
  fechaDelDocumento,
  MAX_IPS_BYTES,
  mergeIps,
  type IpsPreview,
  type IpsSeleccion,
} from '../lib/ipsImport';
import { toForm, toInput } from '../lib/vitalInfo';

type Clave = keyof IpsSeleccion;

/** Cada ítem de la propuesta, con la clave con la que se tilda. */
function items(
  preview: IpsPreview,
): { id: string; grupo: Clave; texto: string; detalle?: string }[] {
  return [
    ...preview.propuesta.allergies.map((a, i) => ({
      id: `allergies.${i}`,
      grupo: 'allergies' as const,
      texto: a.que,
      detalle: a.gravedad,
    })),
    ...preview.propuesta.medications.map((m, i) => ({
      id: `medications.${i}`,
      grupo: 'medications' as const,
      texto: m.droga,
      detalle: m.dosis,
    })),
    ...preview.propuesta.conditions.map((c, i) => ({
      id: `conditions.${i}`,
      grupo: 'conditions' as const,
      texto: c.nombre,
      detalle: c.codigo,
    })),
  ];
}

const GRUPOS: { clave: Clave; titulo: string }[] = [
  { clave: 'allergies', titulo: 'Alergias' },
  { clave: 'medications', titulo: 'Medicación' },
  { clave: 'conditions', titulo: 'Condiciones' },
];

/**
 * Importar el resumen de salud IPS que te dio otro centro (ENG-246, ADR-022) y
 * cargar con él tu MediPass.
 *
 * El archivo se lee en el backend y vuelve una propuesta: **no se guarda nada
 * hasta que el paciente elige** qué cargar. Lo elegido se suma a lo que ya
 * tenía, sin borrar ni repetir. Nada de esto entra a la historia clínica.
 */
export function IpsImport({ onDone }: { onDone: (guardado: boolean) => void }) {
  const perfil = useMyProfile();
  const guardar = useUpdateVitalInfo();
  const leer = useMutation({ mutationFn: previewIps });
  const [preview, setPreview] = useState<IpsPreview | null>(null);
  const [elegidos, setElegidos] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const inputId = useId();

  async function elegirArchivo(archivo: File | undefined) {
    setError(null);
    setPreview(null);
    if (!archivo) return;
    if (archivo.size > MAX_IPS_BYTES) {
      setError('El archivo es demasiado grande para un resumen de salud (máximo 100 kB).');
      return;
    }
    let documento: unknown;
    try {
      documento = JSON.parse(await archivo.text());
    } catch {
      setError(
        'No pudimos leer el archivo. Tiene que ser el resumen de salud (IPS) en formato JSON que te dio tu centro de salud.',
      );
      return;
    }
    leer.mutate(documento, {
      onSuccess: (resultado) => {
        setPreview(resultado);
        // Arranca todo tildado: es lo que el paciente vino a cargar, y destilda lo que no.
        setElegidos(new Set(items(resultado).map((i) => i.id)));
      },
      onError: (e) => setError(e.message),
    });
  }

  function alternar(id: string) {
    setElegidos((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  async function cargar() {
    if (!preview || guardando) return;
    setGuardando(true);
    setError(null);
    // El PUT reemplaza el bloque entero: se parte del perfil recién pedido para
    // no pisar lo que se haya cambiado desde otro dispositivo.
    const fresco = await perfil.refetch();
    if (fresco.isError || !fresco.data) {
      setError('No pudimos cargar tus datos actuales. Probá de nuevo.');
      setGuardando(false);
      return;
    }
    const seleccion: IpsSeleccion = {
      allergies: preview.propuesta.allergies.filter((_, i) => elegidos.has(`allergies.${i}`)),
      medications: preview.propuesta.medications.filter((_, i) => elegidos.has(`medications.${i}`)),
      conditions: preview.propuesta.conditions.filter((_, i) => elegidos.has(`conditions.${i}`)),
    };
    const { input, errors } = toInput(mergeIps(toForm(fresco.data), seleccion));
    if (Object.keys(errors).length > 0) {
      setError('Hay datos de tu MediPass que no se pueden guardar. Revisalos y probá de nuevo.');
      setGuardando(false);
      return;
    }
    guardar.mutate(input, {
      onSuccess: () => onDone(true),
      onError: (e) => {
        setError(e.message);
        setGuardando(false);
      },
    });
  }

  if (!preview) {
    return (
      <div className="flex min-h-full flex-col gap-4">
        <p className="px-1 text-[13px] leading-[1.6] text-muted">
          Si otro centro de salud te dio tu <strong>resumen de salud (IPS)</strong> en formato
          digital, subilo y te mostramos qué alergias, medicación y condiciones trae. Vos elegís qué
          cargar en tu MediPass: no se guarda nada sin que lo confirmes.
        </p>

        <label
          htmlFor={inputId}
          className="grid cursor-pointer place-items-center gap-1 rounded-[14px] border border-dashed border-line-strong bg-surface-teal/40 px-4 py-8 text-center transition-colors hover:border-brand focus-within:ring-2 focus-within:ring-brand"
        >
          <span className="text-sm font-semibold text-brand-deep">
            {leer.isPending ? 'Leyendo el resumen…' : 'Elegir el archivo del resumen'}
          </span>
          <span className="text-[12px] text-muted">Archivo JSON (FHIR), hasta 100 kB</span>
          <input
            id={inputId}
            type="file"
            accept=".json,application/json,application/fhir+json"
            className="sr-only"
            disabled={leer.isPending}
            onChange={(e) => {
              void elegirArchivo(e.target.files?.[0]);
              // Elegir el mismo archivo otra vez vuelve a dispararlo.
              e.target.value = '';
            }}
          />
        </label>

        {error && (
          <p role="alert" className="px-1 text-[13px] text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }

  const todos = items(preview);
  const fecha = fechaDelDocumento(preview.documento.fecha);

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="px-1 text-[13px] leading-[1.6] text-muted">
        <p className="font-semibold text-brand-deep">
          {preview.documento.titulo ?? 'Resumen de salud'}
        </p>
        {fecha && <p>Del {fecha}</p>}
      </div>

      {preview.documento.dniCoincide === false && (
        <p
          role="alert"
          className="rounded-[10px] border border-tag-warm-dot/40 bg-tag-warm px-4 py-3 text-[13px] leading-[1.6] text-tag-warm-ink"
        >
          <strong>El DNI de este resumen no es el tuyo.</strong> Revisá que sea tuyo antes de
          cargarlo: lo que cargues lo ve un médico en una emergencia.
        </p>
      )}

      {todos.length === 0 ? (
        <p className="rounded-[14px] border border-line bg-white p-4 text-[13px] text-muted">
          Este resumen no trae alergias, medicación ni condiciones para cargar.
        </p>
      ) : (
        <div className="grid gap-4 rounded-[14px] border border-line bg-white p-4">
          {GRUPOS.map(({ clave, titulo }) => {
            const delGrupo = todos.filter((i) => i.grupo === clave);
            if (delGrupo.length === 0) return null;
            return (
              <fieldset key={clave} className="grid gap-2">
                <legend className="mb-1 text-[11px] font-bold tracking-[0.08em] text-muted uppercase">
                  {titulo}
                </legend>
                {delGrupo.map((item) => (
                  <label key={item.id} className="flex items-start gap-3 text-[14px] text-ink">
                    <input
                      type="checkbox"
                      checked={elegidos.has(item.id)}
                      onChange={() => alternar(item.id)}
                      className="mt-[3px] h-4 w-4 shrink-0 accent-brand-deep"
                    />
                    <span>
                      {item.texto}
                      {item.detalle && <Detalle>{item.detalle}</Detalle>}
                    </span>
                  </label>
                ))}
              </fieldset>
            );
          })}
        </div>
      )}

      {preview.vacunas.length > 0 && (
        <div className="px-1 text-[13px] leading-[1.6] text-muted">
          <p className="font-semibold text-brand-deep">
            También trae{' '}
            {preview.vacunas.length === 1 ? 'una vacuna' : `${preview.vacunas.length} vacunas`}
          </p>
          <ul className="list-disc pl-5">
            {preview.vacunas.map((v) => (
              <li key={`${v.vacuna}-${v.fecha ?? ''}`}>
                {v.vacuna}
                {v.fecha && ` (${fechaDelDocumento(v.fecha) ?? v.fecha})`}
              </li>
            ))}
          </ul>
          <p>El MediPass no guarda vacunas.</p>
        </div>
      )}

      {error && (
        <p role="alert" className="px-1 text-[13px] text-danger">
          {error}
        </p>
      )}

      <footer className="sticky bottom-0 -mx-4 -mb-4 mt-auto flex flex-wrap items-center justify-end gap-3 border-t border-line bg-white px-4 py-3">
        <button
          type="button"
          onClick={() => {
            setPreview(null);
            setError(null);
          }}
          disabled={guardando}
          className="rounded-[9px] px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-line-soft hover:text-brand-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          Elegir otro archivo
        </button>
        <button
          type="button"
          onClick={() => void cargar()}
          disabled={elegidos.size === 0 || guardando}
          className="rounded-[9px] bg-brand-deep px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-brand-deep"
        >
          {guardando
            ? 'Cargando…'
            : elegidos.size === 1
              ? 'Cargar 1 dato en mi MediPass'
              : `Cargar ${elegidos.size} datos en mi MediPass`}
        </button>
      </footer>
    </div>
  );
}

function Detalle({ children }: { children: ReactNode }) {
  return <span className="text-muted"> · {children}</span>;
}
