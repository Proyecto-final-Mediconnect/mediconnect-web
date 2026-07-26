import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { getMyProfile } from '../api/getMyProfile';
import { getSpecialties } from '../api/getSpecialties';
import { updateMyProfile } from '../api/updateMyProfile';
import { uploadPhoto } from '../api/uploadPhoto';
import type { ProfessionalProfile } from '../types/professionalProfile';

const PROFILE_KEY = ['professional', 'me'] as const;
const SPECIALTIES_KEY = ['specialties'] as const;

/** Perfil del profesional autenticado. */
export function useMyProfile() {
  return useQuery({ queryKey: PROFILE_KEY, queryFn: getMyProfile });
}

/** Catálogo de especialidades (cacheado: cambia poco). */
export function useSpecialties() {
  return useQuery({
    queryKey: SPECIALTIES_KEY,
    queryFn: getSpecialties,
    staleTime: 1000 * 60 * 60,
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
