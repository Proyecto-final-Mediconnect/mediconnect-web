import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isClientError } from '../../../shared/api/apiError';
import {
  bookAppointment,
  cancelAppointment,
  getAvailability,
  getMyAppointments,
} from '../api/appointmentsApi';

const MY_APPOINTMENTS_KEY = ['appointments', 'me'] as const;

const availabilityKey = (professionalId: string, from: string, to: string) =>
  ['availability', professionalId, from, to] as const;

/** Mismo criterio que `useSchedule` y `useProfile`: los 4xx no se reintentan
 *  (un 404 de profesional inexistente no mejora reintentando), los 5xx una vez. */
const retryServerErrorsOnly = (failureCount: number, error: Error) =>
  !isClientError(error) && failureCount < 1;

export function useAvailability(professionalId: string, from: string, to: string) {
  return useQuery({
    queryKey: availabilityKey(professionalId, from, to),
    queryFn: () => getAvailability(professionalId, from, to),
    retry: retryServerErrorsOnly,
    // Cambiar de semana cambia la queryKey. Sin esto, cada click dejaría la
    // consulta en `pending` y la pantalla entera —incluidos los propios botones
    // de navegación— desaparecería hasta que llegue la respuesta. Con los datos
    // anteriores como placeholder, la grilla vieja se queda hasta que hay una
    // nueva; `isFetching` avisa que se está actualizando.
    placeholderData: keepPreviousData,
    // La disponibilidad envejece rápido: entre que se carga la pantalla y el
    // paciente elige, otro puede haber reservado. Se considera vieja enseguida
    // para que al volver a la pestaña se refresque sola.
    staleTime: 30_000,
  });
}

/**
 * Los turnos del usuario.
 *
 * @param enabled En `false` no pide nada. Existe por el MODERADOR: no tiene
 *   turnos propios ni la ruta le corresponde, así que el menú lateral pediría una
 *   lista que nunca va a poder usar.
 */
export function useMyAppointments(enabled = true) {
  return useQuery({
    queryKey: MY_APPOINTMENTS_KEY,
    queryFn: getMyAppointments,
    retry: retryServerErrorsOnly,
    enabled,
  });
}

export function useBookAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bookAppointment,
    onSuccess: () => {
      // La grilla queda desactualizada por definición: el horario que se acaba
      // de tomar tiene que pasar a "ocupado" sin recargar la página.
      void queryClient.invalidateQueries({ queryKey: ['availability'] });
      void queryClient.invalidateQueries({ queryKey: MY_APPOINTMENTS_KEY });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelAppointment,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: MY_APPOINTMENTS_KEY });
      // Cancelar libera el horario: la grilla de reserva vuelve a ofrecerlo.
      // Sin esto, el paciente cancela y sigue viendo su propio turno "ocupado".
      void queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}
