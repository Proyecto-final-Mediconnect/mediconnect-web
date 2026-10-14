import { useMutation } from '@tanstack/react-query';
import {
  type PasswordRecoveryError,
  requestPasswordReset,
  resetPassword,
} from '../api/passwordRecovery';
import type {
  ForgotPasswordInput,
  PasswordRecoveryResponse,
  ResetPasswordInput,
} from '../types/passwordRecovery';

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) => requestPasswordReset(input),
  });
}

export function useResetPassword() {
  return useMutation<PasswordRecoveryResponse, PasswordRecoveryError, ResetPasswordInput>({
    mutationFn: (input: ResetPasswordInput) => resetPassword(input),
  });
}
