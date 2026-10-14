import { useMutation } from '@tanstack/react-query';
import { requestPasswordReset, resetPassword } from '../api/passwordRecovery';
import type { ForgotPasswordInput, ResetPasswordInput } from '../types/passwordRecovery';

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) => requestPasswordReset(input),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => resetPassword(input),
  });
}
