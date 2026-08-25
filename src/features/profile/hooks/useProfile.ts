import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { isClientError } from '../api/apiError';
import { getMyProfile } from '../api/getMyProfile';
import { getSpecialties } from '../api/getSpecialties';
import { updateMyProfile } from '../api/updateMyProfile';
import { uploadPhoto } from '../api/uploadPhoto';
import type { ProfessionalProfile } from '../types/professionalProfile';

const PROFILE_KEY = ['professional', 'me'] as const;
const SPECIALTIES_KEY = ['specialties'] as const;

/**
 * Reintentar un 4xx no arregla nada: el 401 (sesión vencida) o el 400 van a volver
 * igual, y el default de react-query son 3 reintentos. Los 5xx sí pueden ser
 * transitorios, así que esos se reintentan una vez.
 */
const retryServerErrorsOnly = (failureCount: number, error: Error) =>
  !isClientError(error) && failureCount < 1;

/** Perfil del profesional autenticado. */
export function useMyProfile() {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: getMyProfile,
    retry: retryServerErrorsOnly,
  });
}

/** Catálogo de especialidades (cacheado: cambia poco). */
export function useSpecialties() {
  return useQuery({
    queryKey: SPECIALTIES_KEY,
    queryFn: getSpecialties,
    staleTime: 1000 * 60 * 60,
    retry: retryServerErrorsOnly,
  });
}

/** Guarda cambios del perfil y refresca la caché con la respuesta. */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (profile: ProfessionalProfile) =>
      queryClient.setQueryData(PROFILE_KEY, profile),
  });
}

/** Sube la foto y actualiza la caché con el perfil devuelto (con la nueva URL). */
export function useUploadPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadPhoto,
    onSuccess: (profile: ProfessionalProfile) =>
      queryClient.setQueryData(PROFILE_KEY, profile),
  });
}
