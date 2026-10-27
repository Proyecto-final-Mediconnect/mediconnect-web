import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMyCancellationPolicy, useSaveCancellationPolicy } from '../hooks/useCancellationPolicy';
import { describePolicy, MAX_POLICY_HOURS, validatePolicy } from '../lib/policy';
import type { CancellationPolicy } from '../types/cancellationPolicy';

/** Los inputs se editan como texto: un campo vacío tiene que poder existir
 *  mientras se escribe, y recién al validar se convierte en número. */
type Valores = Record<keyof CancellationPolicy, string>;

function aValores(policy: CancellationPolicy): Valores {
  return {
    hoursFullRefund: String(policy.hoursFullRefund),
    hoursPartialRefund: String(policy.hoursPartialRefund),
    partialRefundPercent: String(policy.partialRefundPercent),
  };
}

/** `''` pasa a `NaN` y no a 0: un campo vacío no es "cero horas". */
function aPolicy(valores: Valores): CancellationPolicy {
  const numero = (v: string) => (v.trim() === '' ? Number.NaN : Number(v));
  return {
    hoursFullRefund: numero(valores.hoursFullRefund),
    hoursPartialRefund: numero(valores.hoursPartialRefund),
    partialRefundPercent: numero(valores.partialRefundPercent),
  };
}

const CAMPO =
  'w-full rounded-[8px] border border-line-strong bg-white px-3 py-2 font-semibold text-brand-deep focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand';

/**
 * Política de cancelación del profesional (ENG-171, la pantalla de ENG-67).
 *
 * Se guarda aparte de la agenda semanal: son cosas independientes, y así un
 * cambio de horarios sin guardar no se pierde por guardar la política.
 *
 * El texto de abajo es el mismo que ve el paciente al reservar y al cancelar, y
 * se actualiza mientras se escribe.
 */
export function CancellationPolicyForm() {
  const { data: policy, isPending, isError, error } = useMyCancellationPolicy();
  const save = useSaveCancellationPolicy();

  const [valores, setValores] = useState<Valores | null>(null);
  const [tocado, setTocado] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const sembrado = useRef(false);

  useEffect(() => {
    if (policy && !sembrado.current) {
      setValores(aValores(policy));
      sembrado.current = true;
    }
  }, [policy]);

  if (isError) {
    return (
      <p role="alert" className="text-danger">
        {error instanceof Error ? error.message : 'No se pudo cargar tu política de cancelación.'}
      </p>
    );
  }
  if (isPending || !policy || !valores) {
    return <p className="text-muted">Cargando tu política de cancelación…</p>;
  }

  const actual = aPolicy(valores);
  const problema = validatePolicy(actual);

  function cambiar(campo: keyof CancellationPolicy, valor: string) {
    setGuardado(false);
    setValores((prev) => (prev ? { ...prev, [campo]: valor } : prev));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTocado(true);
    setGuardado(false);
    if (problema) return;

    save.mutate(actual, {
      onSuccess: (fresca) => {
        setValores(aValores(fresca));
        setTocado(false);
        setGuardado(true);
      },
    });
  }

  const campos: {
    campo: keyof CancellationPolicy;
    etiqueta: string;
    sufijo: string;
    max: number;
  }[] = [
    {
      campo: 'hoursFullRefund',
      etiqueta: 'Devolución total si cancela con al menos',
      sufijo: 'horas',
      max: MAX_POLICY_HOURS,
    },
    {
      campo: 'hoursPartialRefund',
      etiqueta: 'Devolución parcial si cancela con al menos',
      sufijo: 'horas',
      max: MAX_POLICY_HOURS,
    },
    {
      campo: 'partialRefundPercent',
      etiqueta: 'Porcentaje de la devolución parcial',
      sufijo: '%',
      max: 100,
    },
  ];

  const mostrarProblema = tocado && problema !== null;

  return (
    <section
      aria-labelledby="policy-title"
      className="overflow-hidden rounded-[14px] border border-line bg-white"
    >
      <header className="border-b border-line-soft px-6 py-[18px]">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 id="policy-title" className="text-[17px] font-bold text-brand-deep">
            Política de cancelación
          </h2>
          {!policy.configured && (
            <span className="rounded-full bg-surface-teal px-2.5 py-0.5 text-[11px] font-semibold text-brand-hover">
              Por defecto
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[13px] leading-[1.6] text-muted">
          Cuánto le devolvés a un paciente que cancela un turno pagado, según la anticipación. Los
          pacientes la ven antes de reservar y al cancelar.
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="grid gap-5 px-6 py-[18px]">
        <div className="grid gap-4 sm:grid-cols-3">
          {campos.map(({ campo, etiqueta, sufijo, max }) => (
            <label key={campo} className="text-[13px]">
              <span className="mb-1 block font-semibold text-muted">{etiqueta}</span>
              <span className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={max}
                  step={1}
                  value={valores[campo]}
                  onChange={(e) => cambiar(campo, e.target.value)}
                  onBlur={() => setTocado(true)}
                  aria-invalid={mostrarProblema}
                  aria-describedby={mostrarProblema ? 'policy-error' : undefined}
                  className={CAMPO}
                />
                <span className="text-[13px] font-semibold text-muted">{sufijo}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="rounded-[10px] border border-brand/30 bg-surface-teal px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-brand-hover">
            Así la ve el paciente
          </p>
          <p className="mt-1.5 text-[13px] leading-[1.6] text-brand-deep">
            {problema ? 'Corregí los valores para ver el texto.' : describePolicy(actual)}
          </p>
        </div>

        {mostrarProblema && (
          <p
            id="policy-error"
            role="alert"
            className="rounded-[10px] border border-danger/30 bg-danger/5 px-4 py-2.5 text-[13px] text-danger"
          >
            {problema}
          </p>
        )}
        {save.isError && (
          <p
            role="alert"
            className="rounded-[10px] border border-danger/30 bg-danger/5 px-4 py-2.5 text-[13px] text-danger"
          >
            {save.error.message}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-4">
          {guardado && (
            <p role="status" className="text-[13px] font-semibold text-brand-hover">
              Guardamos tu política.
            </p>
          )}
          <button
            type="submit"
            disabled={save.isPending}
            className="rounded-[9px] bg-brand-deep px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {save.isPending ? 'Guardando…' : 'Guardar política'}
          </button>
        </div>
      </form>
    </section>
  );
}
