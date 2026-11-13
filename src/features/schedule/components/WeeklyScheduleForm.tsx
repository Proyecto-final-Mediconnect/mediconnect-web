import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMySchedule, useSaveSchedule } from '../hooks/useSchedule';
import { slotsForRule, toMinutes, toTime } from '../lib/generateSlots';
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
      dayRules[dayRules.length - 1].slotDurationMinutes ?? DEFAULT_RULE.slotDurationMinutes,
  });
}

/** Cuántos turnos genera una franja. Si las horas están mal (fin antes que
 *  inicio) devuelve 0 en vez de romper: el error lo reporta `validateRules`. */
function slotCount(rule: ScheduleRule): number {
  try {
    return slotsForRule(rule).length;
  } catch {
    return 0;
  }
}

/**
 * Configuración de la agenda semanal (ENG-53).
 *
 * Un día puede tener VARIAS franjas (mañana y tarde), que es como está modelada
 * la tabla `schedule_rules` —una fila por franja, sin unique por día— y como
 * trabaja de verdad un profesional de la salud.
 *
 * La pantalla se editaba a ciegas: los siete días formaban una columna larga, la
 * vista previa quedaba abajo de todo y el botón de guardar todavía más abajo, así
 * que para ver el efecto de cambiar una hora había que scrollear hasta el final y
 * volver. Ahora el formulario y la vista previa van lado a lado —la preview
 * reacciona a cada cambio, sin guardar— y la barra de guardado queda pegada al
 * pie con el total de la semana. Cada día además muestra cuántos turnos genera,
 * que es la pregunta que uno se hace al cargar una franja.
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
  const totalSemanal = rules.reduce((total, rule) => total + slotCount(rule), 0);

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
    setRules((prev) => prev.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));
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
    // El formulario va PRIMERO en el DOM y la preview después, aunque en pantalla
    // ancha queden lado a lado: con teclado se recorren los campos antes que un
    // panel que solo se lee.
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_368px]">
      <form onSubmit={handleSubmit}>
        <section
          aria-labelledby="week-title"
          className="overflow-hidden rounded-[14px] border border-line bg-white"
        >
          <header className="border-b border-line-soft px-6 py-[18px]">
            <h2 id="week-title" className="text-[17px] font-bold text-brand-deep">
              Días y horarios de atención
            </h2>
            <p className="mt-1.5 text-[13px] leading-[1.6] text-muted">
              Activá los días que atendés. Podés cargar más de una franja por día si
              trabajás mañana y tarde.
            </p>
          </header>

          <ul className="divide-y divide-line-soft">
            {WEEKDAY_ORDER.map((weekday) => {
              const dayRules = rulesOf(weekday);
              const active = dayRules.length > 0;
              const turnosDelDia = dayRules.reduce((t, r) => t + slotCount(r), 0);

              return (
                <li key={weekday} className={active ? 'bg-white' : 'bg-surface/60'}>
                  <div className="flex items-center justify-between gap-4 px-6 py-4">
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={(e) => toggleDay(weekday, e.target.checked)}
                        className="size-[18px] accent-brand"
                      />
                      <span
                        className={`text-[15px] font-bold ${
                          active ? 'text-brand-deep' : 'text-muted'
                        }`}
                      >
                        {WEEKDAY_NAMES[weekday]}
                      </span>
                    </label>

                    {/* El contador vive fuera del label a propósito: si entrara en
                        el nombre accesible, el lector de pantalla anunciaría
                        "Martes 8 turnos, casilla" en vez del día. */}
                    <span
                      className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${
                        active ? 'text-brand-hover' : 'text-muted-soft'
                      }`}
                    >
                      {active
                        ? `${turnosDelDia} turno${turnosDelDia === 1 ? '' : 's'}`
                        : 'No atendés'}
                    </span>
                  </div>

                  {active && (
                    <div className="grid gap-2.5 px-6 pb-5 pl-[54px]">
                      {dayRules.map((rule) => (
                        <div
                          key={rule.uid}
                          className="flex flex-wrap items-end gap-2.5 rounded-[10px] border border-line-soft bg-surface px-3.5 py-3"
                        >
                          <label className="text-[13px]">
                            <span className="mb-1 block font-semibold text-muted">Desde</span>
                            <input
                              type="time"
                              value={rule.startTime}
                              onChange={(e) =>
                                updateRule(rule.uid, { startTime: e.target.value })
                              }
                              className="rounded-[8px] border border-line-strong bg-white px-3 py-2 font-semibold text-brand-deep focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                              required
                            />
                          </label>

                          <label className="text-[13px]">
                            <span className="mb-1 block font-semibold text-muted">Hasta</span>
                            <input
                              type="time"
                              value={rule.endTime}
                              onChange={(e) => updateRule(rule.uid, { endTime: e.target.value })}
                              className="rounded-[8px] border border-line-strong bg-white px-3 py-2 font-semibold text-brand-deep focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                              required
                            />
                          </label>

                          <label className="text-[13px]">
                            <span className="mb-1 block font-semibold text-muted">
                              Duración del turno
                            </span>
                            <select
                              value={rule.slotDurationMinutes}
                              onChange={(e) =>
                                updateRule(rule.uid, {
                                  slotDurationMinutes: Number(e.target.value),
                                })
                              }
                              className="rounded-[8px] border border-line-strong bg-white px-3 py-2 font-semibold text-brand-deep focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                            >
                              {SLOT_DURATIONS.map((d) => (
                                <option key={d} value={d}>
                                  {d} min
                                </option>
                              ))}
                            </select>
                          </label>

                          <span className="ml-auto flex items-center gap-3 pb-2">
                            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-soft">
                              {slotCount(rule)} turnos
                            </span>
                            {dayRules.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeRule(rule.uid)}
                                aria-label={`Quitar la franja de ${rule.startTime} del ${WEEKDAY_NAMES[weekday].toLowerCase()}`}
                                className="rounded-[7px] border border-line-strong bg-white px-3 py-1.5 text-[12px] font-bold text-muted transition-colors hover:border-danger hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                              >
                                Quitar
                              </button>
                            )}
                          </span>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => addRule(weekday)}
                        className="justify-self-start rounded-[8px] border border-dashed border-line-strong px-3.5 py-2 text-[13px] font-bold text-brand-hover transition-colors hover:border-brand hover:bg-surface-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                      >
                        + Agregar franja
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Pegada al pie: antes había que scrollear los siete días para llegar al
            botón, y el resultado del guardado quedaba fuera de vista. */}
        <div className="sticky bottom-0 mt-3 rounded-[14px] border border-line bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-[13px] text-muted">
              <strong className="font-bold text-brand-deep">{totalSemanal}</strong> turno
              {totalSemanal === 1 ? '' : 's'} por semana, antes de los bloqueos.
            </p>

            <div className="flex items-center gap-4">
              {saved && (
                <p role="status" className="text-[13px] font-semibold text-brand-hover">
                  Agenda guardada.
                </p>
              )}
              <button
                type="submit"
                disabled={saveSchedule.isPending}
                className="rounded-[9px] bg-brand-deep px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveSchedule.isPending ? 'Guardando…' : 'Guardar agenda'}
              </button>
            </div>
          </div>

          {(validationError || saveError) && (
            <p
              role="alert"
              className="mt-3 rounded-[10px] border border-danger/30 bg-danger/5 px-4 py-2.5 text-[13px] text-danger"
            >
              {validationError ?? saveError?.message}
            </p>
          )}
        </div>
      </form>

      <div className="grid gap-4 xl:sticky xl:top-24">
        {/* Toma `rules` del formulario, no del servidor: la preview tiene que
            mostrar lo que se está por guardar. */}
        <SchedulePreview rules={rules} blocks={schedule.blocks} />
        <ScheduleBlocks blocks={schedule.blocks} />
      </div>
    </div>
  );
}
