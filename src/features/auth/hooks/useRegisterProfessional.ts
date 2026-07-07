import { useMutation } from '@tanstack/react-query';
import { registerProfessional } from '../api/registerProfessional';
import type { RegisterProfessionalInput } from '../types/registerProfessional';

export function useRegisterProfessional() {
  return useMutation({
    mutationFn: (input: RegisterProfessionalInput) =>
      registerProfessional(input),
  });
}
