import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isClientError } from '../../profile/api/apiError';
import { getMyProfile } from '../api/getMyProfile';
import { updateMyProfile } from '../api/updateMyProfile';
import { updateMyVitalInfo } from '../api/updateMyVitalInfo';
import type { PatientProfile } from '../types/patientProfile';

const PROFILE_KEY = ['patient', 'me'] as const;

/**
 * Reintentar un 4xx no arregla nada: el 401 (sesión vencida) o el 400 vuelven
 * igual, y el default de react-query son 3 reintentos. Los 5xx pueden ser
 * transitorios, así que esos se reintentan una vez.
 */
const retryServerErrorsOnly = (failureCount: number, error: Error) =>
  !isClientError(error) && failureCount < 1;

/** Perfil del paciente autenticado. */
export function useMyProfile() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: getMyProfile,
    retry: retryServerErrorsOnly,
  });
}

/** Guarda cambios del perfil y refresca la caché con la respuesta. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (profile: PatientProfile) => queryClient.setQueryData(PROFILE_KEY, profile),
  });
}

/**
 * Guarda los datos vitales (ENG-136). El MediPass los lee aparte, así que se lo
 * invalida: lo que se acaba de guardar es lo que tiene que ver el médico.
 */
export function useUpdateVitalInfo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMyVitalInfo,
    onSuccess: async (profile: PatientProfile) => {
      queryClient.setQueryData(PROFILE_KEY, profile);
      await queryClient.invalidateQueries({ queryKey: ['medipass', 'me', 'vital'] });
    },
  });
}
