import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
import { TextField } from '../../../shared/ui/TextField';
import { PasswordRules } from './PasswordRules';
import { useResetPassword } from '../hooks/usePasswordRecovery';
import { resetPasswordSchema } from '../types/passwordRecovery';

type FieldErrors = Partial<Record<'password' | 'passwordConfirmation', string>>;

type ResetPasswordFormProps = {
  /** `token_hash` del enlace del mail (ENG-142). */
  tokenHash: string;
};

export function ResetPasswordForm({ tokenHash }: ResetPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const passwordToggle = {
    passwordVisible: showPasswords,
    onTogglePasswordVisibility: () => setShowPasswords((v) => !v),
  };

  const { mutate, isPending, isSuccess, error } = useResetPassword();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = resetPasswordSchema.safeParse({ password, passwordConfirmation });

    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof FieldErrors;
        if (field && !fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    mutate({ ...result.data, tokenHash });
  }

  if (isSuccess) {
    return (
      <div role="status" className="rounded-[14px] border border-brand/30 bg-surface-teal p-7">
        <div
          aria-hidden
          className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-deep text-xl text-white"
        >
          ✓
        </div>
        <h2 className="font-display mt-5 text-[26px] leading-[1.2] text-brand-deep">
          Cambiaste tu contraseña
        </h2>
        <p className="mt-2.5 text-sm leading-[1.7] text-ink">
          Por seguridad cerramos tu sesión en todos los dispositivos. Ingresá con la contraseña
          nueva.
        </p>
        <Link
          to="/ingresar"
          className="mt-5 inline-flex items-center justify-center rounded-[9px] bg-brand-deep px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <TextField
        id="password"
        name="password"
        label="Contraseña nueva"
        type="password"
        autoComplete="new-password"
        placeholder="Tu contraseña nueva"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        {...passwordToggle}
      />

      <PasswordRules value={password} />
      <TextField
        id="passwordConfirmation"
        name="passwordConfirmation"
        label="Confirmar contraseña"
        type="password"
        autoComplete="new-password"
        placeholder="Repetí la contraseña"
        value={passwordConfirmation}
        onChange={(e) => setPasswordConfirmation(e.target.value)}
        error={errors.passwordConfirmation}
        {...passwordToggle}
      />

      {error && (
        <div role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-danger">
          <p>{error.message}</p>
          {/* El error más común es el enlace vencido o ya usado: la salida es
              pedir otro, así que va acá mismo. */}
          <Link
            to="/recuperar-contrasena"
            className="mt-1.5 inline-block font-semibold underline underline-offset-2"
          >
            Pedir un enlace nuevo
          </Link>
        </div>
      )}

      <Button type="submit" fullWidth disabled={isPending} className="mt-2">
        {isPending ? 'Guardando…' : 'Guardar contraseña'}
      </Button>
    </form>
  );
}
