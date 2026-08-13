import { useState, type FormEvent } from 'react';
import { Button } from '../../../shared/ui/Button';
import { useCreateBlock, useDeleteBlock } from '../hooks/useSchedule';
import { todayLocal } from '../lib/generateSlots';
import { createBlockSchema, type ScheduleBlock } from '../types/schedule';

interface ScheduleBlocksProps {
  blocks: ScheduleBlock[];
}

const EMPTY_FORM = { blockDate: '', startTime: '', endTime: '', reason: '' };

/**
 * Bloqueos puntuales: feriados, licencias o un rato del día (4º criterio de
 * aceptación de ENG-53). Se guardan de a uno, sin pasar por el "Guardar" de la
 * agenda semanal: son operaciones independientes y así un bloqueo cargado no se
 * pierde si el profesional después descarta los cambios de las franjas.
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
      className="rounded-xl border border-slate-200 p-5"
    >
      <h2 id="blocks-title" className="text-lg font-semibold text-ink">
        Bloqueos puntuales
      </h2>
      <p className="mt-1 text-sm text-muted">
        Feriados, licencias o un rato del día que no vas a atender. Sin horario
        se bloquea el día completo.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-5">
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-muted">Fecha</span>
          <input
            type="date"
            value={form.blockDate}
            min={todayLocal()}
            onChange={(e) => setForm({ ...form, blockDate: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            required
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-muted">Desde</span>
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-muted">Hasta</span>
          <input
            type="time"
            value={form.endTime}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="text-sm sm:col-span-4">
          <span className="mb-1 block text-muted">Motivo (opcional)</span>
          <input
            type="text"
            value={form.reason}
            maxLength={200}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Congreso, licencia…"
          />
        </label>

        <div className="flex items-end">
          <Button type="submit" disabled={createBlock.isPending} fullWidth>
            {createBlock.isPending ? 'Agregando…' : 'Agregar'}
          </Button>
        </div>
      </form>

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}

      {blocks.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No tenés bloqueos cargados.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-200">
          {blocks.map((block) => (
            <li
              key={block.id}
              className="flex items-center justify-between gap-3 py-2 text-sm"
            >
              <span className="text-ink">
                <strong className="font-medium">{block.blockDate}</strong>{' '}
                {block.startTime && block.endTime
                  ? `de ${block.startTime} a ${block.endTime}`
                  : 'día completo'}
                {block.reason && (
                  <span className="text-muted"> — {block.reason}</span>
                )}
              </span>
              <Button
                type="button"
                variant="ghost"
                onClick={() => deleteBlock.mutate(block.id)}
                disabled={deleteBlock.isPending}
                aria-label={`Quitar el bloqueo del ${block.blockDate}`}
              >
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
