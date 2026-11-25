import { useState } from 'react';
import { useMyProfile, useUpdateVitalInfo } from '../hooks/usePatientProfile';
import { mergeIps, yaEnMediPass, type IpsResumen, type IpsSeleccion } from '../lib/ipsImport';
import { toForm, toInput } from '../lib/vitalInfo';

type Clave = keyof IpsSeleccion;

const GRUPOS: { clave: Clave; titulo: string }[] = [
  { clave: 'allergies', titulo: 'Alergias' },
  { clave: 'medications', titulo: 'Medicación' },
  { clave: 'conditions', titulo: 'Condiciones' },
];

/** Cada ítem que se puede sumar, con la clave con la que se tilda. */
function items(resumen: IpsResumen) {
  return [
    ...resumen.propuesta.allergies.map((a, i) => ({
      id: `allergies.${i}`,
      grupo: 'allergies' as const,
      texto: a.que,
      detalle: a.gravedad,
    })),
    ...resumen.propuesta.medications.map((m, i) => ({
      id: `medications.${i}`,
      grupo: 'medications' as const,
      texto: m.droga,
      detalle: m.dosis,
    })),
    ...resumen.propuesta.conditions.map((c, i) => ({
      id: `conditions.${i}`,
      grupo: 'conditions' as const,
      texto: c.nombre,
      detalle: c.codigo,
    })),
  ];
}

/**
 * Sumar a tu MediPass lo que trae tu resumen de salud (ENG-246): el paso
 * opcional después de subirlo. El resumen ya quedó en tu historia; esto solo
 * copia las alergias, la medicación y las condiciones que elijas a tus datos de
 * emergencia, que es lo que ve un médico de guardia al escanear tu código.
 *
 * Lo elegido se **suma** a lo que ya tenías, sin borrar ni repetir, y se guarda
 * con el `PUT /patients/me/vital` de siempre.
 */
export function IpsMediPass({
  resumen,
  onDone,
  onCancel,
}: {
  resumen: IpsResumen;
  /** Se guardó: quien lo abrió avisa y cierra. */
  onDone: () => void;
  onCancel: () => void;
}) {
  const perfil = useMyProfile();
  const guardar = useUpdateVitalInfo();
  const todos = items(resumen);
  // Lo que ya está en el MediPass se muestra, pero no se vuelve a ofrecer.
  const ya = yaEnMediPass(perfil.data, resumen);
  // Arranca tildado lo que falta: es lo que el paciente vino a cargar, y destilda lo que no.
  const [elegidos, setElegidos] = useState<Set<string>>(
    () => new Set(todos.filter((i) => !ya.has(i.id)).map((i) => i.id)),
  );
  // Si el perfil llegó después de armar la selección, lo que ya estaba no cuenta.
  const aSumar = new Set([...elegidos].filter((id) => !ya.has(id)));
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function alternar(id: string) {
    setElegidos((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  async function cargar() {
    if (guardando) return;
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
      allergies: resumen.propuesta.allergies.filter((_, i) => aSumar.has(`allergies.${i}`)),
      medications: resumen.propuesta.medications.filter((_, i) => aSumar.has(`medications.${i}`)),
      conditions: resumen.propuesta.conditions.filter((_, i) => aSumar.has(`conditions.${i}`)),
    };
    const { input, errors } = toInput(mergeIps(toForm(fresco.data), seleccion));
    if (Object.keys(errors).length > 0) {
      setError('Hay datos de tu MediPass que no se pueden guardar. Revisalos y probá de nuevo.');
      setGuardando(false);
      return;
    }
    guardar.mutate(input, {
      onSuccess: onDone,
      onError: (e) => {
        setError(e.message);
        setGuardando(false);
      },
    });
  }

  return (
    <div className="flex min-h-full flex-col gap-4">
      <p className="px-1 text-[13px] leading-[1.6] text-muted">
        Elegí qué sumar a tus datos de emergencia: es lo que ve un médico de guardia al escanear tu
        MediPass. Lo que ya tenías no se borra.
      </p>

      <div className="grid gap-4 rounded-[14px] border border-line bg-white p-4">
        {GRUPOS.map(({ clave, titulo }) => {
          const delGrupo = todos.filter((i) => i.grupo === clave);
          if (delGrupo.length === 0) return null;
          return (
            <fieldset key={clave} className="grid gap-2">
              <legend className="mb-1 text-[11px] font-bold tracking-[0.08em] text-muted uppercase">
                {titulo}
              </legend>
              {delGrupo.map((item) => {
                const yaEsta = ya.has(item.id);
                return (
                  <label
                    key={item.id}
                    className={`flex items-start gap-3 text-[14px] ${yaEsta ? 'text-muted' : 'text-ink'}`}
                  >
                    <input
                      type="checkbox"
                      checked={yaEsta || elegidos.has(item.id)}
                      disabled={yaEsta}
                      onChange={() => alternar(item.id)}
                      className="mt-[3px] h-4 w-4 shrink-0 accent-brand-deep disabled:opacity-50"
                    />
                    <span>
                      {item.texto}
                      {item.detalle && <span className="text-muted"> · {item.detalle}</span>}
                      {yaEsta && (
                        <span className="ml-1.5 inline-block rounded-full bg-surface-teal px-2 py-0.5 text-[11px] font-semibold text-brand-hover">
                          Ya está en tu MediPass
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="px-1 text-[13px] text-danger">
          {error}
        </p>
      )}

      <footer className="sticky bottom-0 -mx-4 -mb-4 mt-auto flex flex-wrap items-center justify-end gap-3 border-t border-line bg-white px-4 py-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={guardando}
          className="rounded-[9px] px-4 py-2.5 text-sm font-semibold text-muted transition-colors hover:bg-line-soft hover:text-brand-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          Volver
        </button>
        <button
          type="button"
          onClick={() => void cargar()}
          disabled={aSumar.size === 0 || guardando}
          className="rounded-[9px] bg-brand-deep px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-brand-deep"
        >
          {guardando
            ? 'Guardando…'
            : aSumar.size === 1
              ? 'Sumar 1 dato a mi MediPass'
              : `Sumar ${aSumar.size} datos a mi MediPass`}
        </button>
      </footer>
    </div>
  );
}
