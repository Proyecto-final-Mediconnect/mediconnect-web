import { useMutation } from '@tanstack/react-query';
import { registerPatient } from '../api/registerPatient';
import type { RegisterPatientInput } from '../types/register';

export function useRegisterPatient() {
  return useMutation({
    mutationFn: (input: RegisterPatientInput) => registerPatient(input),
  });
}
