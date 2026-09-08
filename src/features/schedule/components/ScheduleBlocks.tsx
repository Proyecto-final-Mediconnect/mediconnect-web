import { useState, type FormEvent } from 'react';
import { useCreateBlock, useDeleteBlock } from '../hooks/useSchedule';
import { todayLocal } from '../lib/generateSlots';
import { createBlockSchema, type ScheduleBlock } from '../types/schedule';

interface ScheduleBlocksProps {
  blocks: ScheduleBlock[];
}

const EMPTY_FORM = { blockDate: '', startTime: '', endTime: '', reason: '' };

/** Estilo compartido de los campos: en una columna angosta todos ocupan el ancho. */
const CAMPO =
  'w-full rounded-[8px] border border-line-strong bg-white px-3 py-2 font-semibold text-brand-deep focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand';

/**
 * Bloqueos puntuales: feriados, licencias o un rato del día (4º criterio de
 * aceptación de ENG-53). Se guardan de a uno, sin pasar por el "Guardar" de la
 * agenda semanal: son operaciones independientes y así un bloqueo cargado no se
 * pierde si el profesional después descarta los cambios de las franjas.
 *
 * El formulario va en una columna y no en la grilla de cinco que tenía: ahora
 * vive en la columna angosta, al lado de la vista previa que muestra el efecto
 * del bloqueo.
 */
export function ScheduleBlocks({ blocks }: ScheduleBlocksProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const createBlock = useCreateBlock();
  const deleteBlock = useDeleteBlock();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Los inputs vacíos llegan como '' — el backend espera que las horas estén
    // ausentes, no vacías, para interpretar "día completo".
    const payload = {
      blockDate: form.blockDate,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      reason: form.reason.trim() || undefined,
    };

    const parsed = createBlockSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    createBlock.mutate(parsed.data, {
      onSuccess: () => setForm(EMPTY_FORM),
      onError: (err: Error) => setError(err.message),
    });
  }

  return (
    <section
      aria-labelledby="blocks-title"
      className="overflow-hidden rounded-[14px] border border-line bg-white"
    >
      <header className="border-b border-line-soft px-5 py-[18px]">
        <h2
          id="blocks-title"
          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
        >
          Bloqueos puntuales
        </h2>
        <p className="mt-2 text-[13px] leading-[1.6] text-muted">
          Feriados, licencias o un rato del día que no vas a atender. Sin horario se
          bloquea el día completo.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-3 px-5 py-[18px]">
        <label className="text-[13px]">
          <span className="mb-1 block font-semibold text-muted">Fecha</span>
          <input
            type="date"
            value={form.blockDate}
            min={todayLocal()}
            onChange={(e) => setForm({ ...form, blockDate: e.target.value })}
            className={CAMPO}
            required
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-[13px]">
            <span className="mb-1 block font-semibold text-muted">Desde</span>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              className={CAMPO}
            />
          </label>

          <label className="text-[13px]">
            <span className="mb-1 block font-semibold text-muted">Hasta</span>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              className={CAMPO}
            />
          </label>
        </div>

        <label className="text-[13px]">
          <span className="mb-1 block font-semibold text-muted">Motivo (opcional)</span>
          <input
            type="text"
            value={form.reason}
            maxLength={200}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className={CAMPO}
            placeholder="Congreso, licencia…"
          />
        </label>

        <button
          type="submit"
          disabled={createBlock.isPending}
          className="rounded-[9px] border border-line-strong bg-white py-2.5 text-[13px] font-bold text-brand-deep transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {createBlock.isPending ? 'Agregando…' : 'Agregar bloqueo'}
        </button>
      </form>

      {error && (
        <p
          role="alert"
          className="mx-5 mb-4 rounded-[10px] border border-danger/30 bg-danger/5 px-4 py-2.5 text-[13px] text-danger"
        >
          {error}
        </p>
      )}

      {blocks.length === 0 ? (
        <p className="border-t border-line-soft px-5 py-4 text-[13px] text-muted">
          No tenés bloqueos cargados.
        </p>
      ) : (
        <ul className="divide-y divide-line-soft border-t border-line-soft">
          {blocks.map((block) => (
            <li
              key={block.id}
              className="flex items-center justify-between gap-3 px-5 py-3 text-[13px]"
            >
              <span className="min-w-0 text-ink">
                <strong className="font-bold text-brand-deep">{block.blockDate}</strong>{' '}
                {block.startTime && block.endTime
                  ? `de ${block.startTime} a ${block.endTime}`
                  : 'día completo'}
                {block.reason && <span className="text-muted"> — {block.reason}</span>}
              </span>
              <button
                type="button"
                className="flex-none rounded-[7px] border border-line-strong bg-white px-3 py-1.5 text-[12px] font-bold text-muted transition-colors hover:border-danger hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
                onClick={() => {
                  setError(null);
                  // Sin `onError` el borrado fallaba en silencio: la fila seguía
                  // ahí y el usuario no tenía forma de saber por qué.
                  deleteBlock.mutate(block.id, {
                    onError: (err: Error) => setError(err.message),
                  });
                }}
                // Solo se deshabilita el botón del bloqueo que se está
                // borrando, no todos los de la lista.
                disabled={
                  deleteBlock.isPending && deleteBlock.variables === block.id
                }
                aria-label={`Quitar el bloqueo del ${block.blockDate}`}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
