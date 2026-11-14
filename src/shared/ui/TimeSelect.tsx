import type { SelectHTMLAttributes } from 'react';

/** Cada cuántos minutos se ofrece un horario. Las duraciones de turno son de
 *  15, 30, 45 o 60 minutos, así que cualquier franja cae en esta grilla. */
const STEP_MINUTES = 15;

const HORAS: string[] = Array.from({ length: (24 * 60) / STEP_MINUTES }, (_, i) => {
  const minutos = i * STEP_MINUTES;
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
});

/**
 * Una hora en formato de 24 h ("09:00", "13:30").
 *
 * Reemplaza a `<input type="time">`, que dibuja la hora según el idioma del
 * navegador: en uno en inglés mostraba "09:00 a.m." al lado de la vista previa
 * en 24 h. Un `<select>` con los horarios escritos se ve igual en todos lados.
 *
 * `emptyLabel` agrega una opción vacía (por ejemplo, "Todo el día" en un
 * bloqueo). Si `value` no cae en la grilla (un horario cargado antes) se suma
 * igual, para no perderlo al editar.
 */
export function TimeSelect({
  value,
  emptyLabel,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'children'> & {
  value: string;
  emptyLabel?: string;
}) {
  const opciones = value && !HORAS.includes(value) ? [...HORAS, value].sort() : HORAS;

  return (
    <select value={value} {...props}>
      {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
      {opciones.map((hora) => (
        <option key={hora} value={hora}>
          {hora}
        </option>
      ))}
    </select>
  );
}
