import { useMemo } from 'react';
import { useMyAppointments } from '../../appointments/hooks/useAppointments';
import { counterpartOf, isActive, splitByTime } from '../../appointments/lib/myAppointments';
import type { Appointment } from '../../appointments/types/appointment';

/** Cuántos turnos anteriores muestra el panel del chat. El resto está en "Mis turnos". */
const PAST_LIMIT = 3;

/** Los anteriores que importan en el chat: los que se hicieron, no los cancelados. */
const PAST_STATUSES = ['COMPLETADO', 'NO_ASISTIO'];

/**
 * Los turnos con la otra persona del chat: el próximo vigente y los últimos
 * anteriores.
 *
 * Salen de `GET /appointments/me`, que ya usan "Mis turnos" y el menú lateral y
 * sirve a los dos roles, así que el chat no suma un endpoint. Si la lista falla
 * el chat sigue andando: el panel y el chip del próximo turno simplemente no se
 * muestran.
 */
export function useCounterpartAppointments(
  counterpartId: string,
  myId: string,
  now: Date = new Date(),
): { next: Appointment | null; past: Appointment[] } {
  const { data } = useMyAppointments();

  // `now` cambia en cada render: se agrupa por minuto para no recalcular de más.
  const minute = Math.floor(now.getTime() / 60_000);
  return useMemo(() => {
    const withCounterpart = (data ?? []).filter(
      (a) => counterpartOf(a, myId)?.id === counterpartId,
    );
    const { upcoming, past } = splitByTime(withCounterpart, new Date(minute * 60_000));
    return {
      next: upcoming.find(isActive) ?? null,
      past: past.filter((a) => PAST_STATUSES.includes(a.status)).slice(0, PAST_LIMIT),
    };
  }, [data, counterpartId, myId, minute]);
}
