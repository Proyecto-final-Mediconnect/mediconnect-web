import { useMutation } from '@tanstack/react-query';
import { loginPatient } from '../api/loginPatient';
import type { LoginInput } from '../types/login';

export function useLogin() {
  return useMutation({
    mutationFn: (input: LoginInput) => loginPatient(input),
  });
}
