import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '../../../shared/ui/Button';
import { useMySchedule, useSaveSchedule } from '../hooks/useSchedule';
import { toMinutes, toTime } from '../lib/generateSlots';
import { validateRules } from '../lib/validateRules';
import {
  saveScheduleSchema,
  SLOT_DURATIONS,
  WEEKDAY_NAMES,
  WEEKDAY_ORDER,
  type ScheduleRule,
} from '../types/schedule';
import { ScheduleBlocks } from './ScheduleBlocks';
import { SchedulePreview } from './SchedulePreview';

/** Franja que se agrega al activar un día: jornada de mañana típica. */
const DEFAULT_RULE = {
  startTime: '09:00',
  endTime: '13:00',
  slotDurationMinutes: 30,
} as const;

/** Duración de una franja recién agregada, en minutos (4 h). */
const DEFAULT_SPAN = 4 * 60;
const END_OF_DAY = 23 * 60 + 59;

/**
 * Franja en edición. El `uid` es solo del cliente: existe para que React tenga
 * una key estable. Con `key={index}`, al quitar la primera de dos franjas React
 * reusa el DOM de la que se fue y el foco salta al input equivocado.
 *
 * No se persiste ni viaja en el `PUT`: el payload se arma con los campos del DTO
 * explícitamente, y el backend rechaza cualquier extra (`forbidNonWhitelisted`).
 */
interface EditableRule extends ScheduleRule {
  uid: string;
}

let nextUid = 0;

function withUid(rule: ScheduleRule): EditableRule {
  return { ...rule, uid: `rule-${nextUid++}` };
}

/**
 * Franja nueva para un día, arrancando donde termina la última que ya tiene.
 *
 * Antes siempre se agregaba 09:00-13:00, así que apretar "Agregar franja" en un
 * día que ya tenía la jornada de mañana creaba un duplicado exacto y el usuario
 * se comía un error de solape sin haber tocado nada.
 */
function nextRuleFor(weekday: number, existing: ScheduleRule[]): EditableRule {
  const dayRules = existing.filter((r) => r.weekday === weekday);
  if (dayRules.length === 0) return withUid({ weekday, ...DEFAULT_RULE });

  const lastEnd = Math.max(...dayRules.map((r) => toMinutes(r.endTime)));
  const start = Math.min(lastEnd, END_OF_DAY);

  return withUid({
    weekday,
    startTime: toTime(start),
    endTime: toTime(Math.min(start + DEFAULT_SPAN, END_OF_DAY)),
    // Se hereda la duración de la última franja: si el profesional atiende de a
    // 45 min a la mañana, lo más probable es que a la tarde también.
    slotDurationMinutes:
      dayRules[dayRules.length - 1].slotDurationMinutes ??
      DEFAULT_RULE.slotDurationMinutes,
  });
}

/**
 * Configuración de la agenda semanal (ENG-53).
 *
 * Un día puede tener VARIAS franjas (mañana y tarde), que es como está modelada
 * la tabla `schedule_rules` — una fila por franja, sin unique por día — y como
 * trabaja de verdad un profesional de la salud.
 */
export function WeeklyScheduleForm() {
  const { data: schedule, isPending, isError, error } = useMySchedule();
  const saveSchedule = useSaveSchedule();

  const [rules, setRules] = useState<EditableRule[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const seeded = useRef(false);

  // Se siembra una sola vez: agregar o quitar un bloqueo invalida la query y
  // traería la agenda de nuevo, pisando las franjas que se estén editando.
  useEffect(() => {
    if (schedule && !seeded.current) {
      setRules(schedule.rules.map(withUid));
      seeded.current = true;
    }
  }, [schedule]);

  if (isError) {
    return (
      <p role="alert" className="text-danger">
        {error instanceof Error ? error.message : 'No se pudo cargar tu agenda.'}
      </p>
    );
  }
  if (isPending || !schedule) {
    return <p className="text-muted">Cargando tu agenda…</p>;
  }

  const rulesOf = (weekday: number) => rules.filter((r) => r.weekday === weekday);

  function addRule(weekday: number) {
    setSaved(false);
    setRules((prev) => [...prev, nextRuleFor(weekday, prev)]);
  }

  function removeRule(uid: string) {
    setSaved(false);
    setRules((prev) => prev.filter((r) => r.uid !== uid));
  }

  function updateRule(uid: string, patch: Partial<ScheduleRule>) {
    setSaved(false);
    setRules((prev) =>
      prev.map((r) => (r.uid === uid ? { ...r, ...patch } : r)),
    );
  }

  function toggleDay(weekday: number, active: boolean) {
    setSaved(false);
    setRules((prev) =>
      active
        ? [...prev, withUid({ weekday, ...DEFAULT_RULE })]
        : prev.filter((r) => r.weekday !== weekday),
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);

    const problema = validateRules(rules);
    if (problema) {
      setValidationError(problema);
      return;
    }
    setValidationError(null);

    // El backend rechaza campos desconocidos (`forbidNonWhitelisted`), así que el
    // `id` de las franjas ya guardadas no puede viajar: se manda solo lo que
    // declara el DTO. El schema además angosta `slotDurationMinutes` al catálogo,
    // que es lo que espera el backend.
    const payload = saveScheduleSchema.safeParse({
      rules: rules.map(({ weekday, startTime, endTime, slotDurationMinutes }) => ({
        weekday,
        startTime,
        endTime,
        slotDurationMinutes,
      })),
    });

    if (!payload.success) {
      setValidationError(payload.error.issues[0].message);
      return;
    }

    saveSchedule.mutate(payload.data, {
      onSuccess: (fresh) => {
        setRules(fresh.rules.map(withUid));
        setSaved(true);
      },
    });
  }

  const saveError = saveSchedule.error;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <section
          aria-labelledby="week-title"
          className="rounded-xl border border-slate-200 p-5"
        >
          <h2 id="week-title" className="text-lg font-semibold text-ink">
            Días y horarios de atención
          </h2>
          <p className="mt-1 text-sm text-muted">
            Activá los días que atendés. Podés cargar más de una franja por día
            si trabajás mañana y tarde.
          </p>

          <ul className="mt-4 divide-y divide-slate-200">
            {WEEKDAY_ORDER.map((weekday) => {
              const dayRules = rulesOf(weekday);
              const active = dayRules.length > 0;

              return (
                <li key={weekday} className="py-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => toggleDay(weekday, e.target.checked)}
                      className="size-4 accent-brand"
                    />
                    <span className="font-medium text-ink">
                      {WEEKDAY_NAMES[weekday]}
                    </span>
                    {!active && (
                      <span className="text-sm text-muted">No atendés</span>
                    )}
                  </label>

                  {active && (
                    <div className="mt-3 space-y-2 pl-7">
                      {dayRules.map((rule) => (
                        <div
                          key={rule.uid}
                          className="flex flex-wrap items-end gap-2"
                        >
                          <label className="text-sm">
                            <span className="mb-1 block text-muted">Desde</span>
                            <input
                              type="time"
                              value={rule.startTime}
                              onChange={(e) =>
                                updateRule(rule.uid, { startTime: e.target.value })
                              }
                              className="rounded-lg border border-slate-300 px-3 py-2"
                              required
                            />
                          </label>

                          <label className="text-sm">
                            <span className="mb-1 block text-muted">Hasta</span>
                            <input
                              type="time"
                              value={rule.endTime}
                              onChange={(e) =>
                                updateRule(rule.uid, { endTime: e.target.value })
                              }
                              className="rounded-lg border border-slate-300 px-3 py-2"
                              required
                            />
                          </label>

                          <label className="text-sm">
                            <span className="mb-1 block text-muted">
                              Duración del turno
                            </span>
                            <select
                              value={rule.slotDurationMinutes}
                              onChange={(e) =>
                                updateRule(rule.uid, {
                                  slotDurationMinutes: Number(e.target.value),
                                })
                              }
                              className="rounded-lg border border-slate-300 px-3 py-2"
                            >
                              {SLOT_DURATIONS.map((d) => (
                                <option key={d} value={d}>
                                  {d} min
                                </option>
                              ))}
                            </select>
                          </label>

                          {dayRules.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => removeRule(rule.uid)}
                              aria-label={`Quitar la franja de ${rule.startTime} del ${WEEKDAY_NAMES[weekday].toLowerCase()}`}
                            >
                              Quitar
                            </Button>
                          )}
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => addRule(weekday)}
                      >
                        + Agregar franja
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {validationError && (
          <p role="alert" className="text-sm text-danger">
            {validationError}
          </p>
        )}
        {saveError && (
          <p role="alert" className="text-sm text-danger">
            {saveError.message}
          </p>
        )}
        {saved && (
          <p role="status" className="text-sm text-brand">
            Agenda guardada.
          </p>
        )}

        <Button type="submit" disabled={saveSchedule.isPending}>
          {saveSchedule.isPending ? 'Guardando…' : 'Guardar agenda'}
        </Button>
      </form>

      {/* Toma `rules` del formulario, no del servidor: la preview tiene que
          mostrar lo que se está por guardar. */}
      <SchedulePreview rules={rules} blocks={schedule.blocks} />

      <ScheduleBlocks blocks={schedule.blocks} />
    </div>
  );
}
