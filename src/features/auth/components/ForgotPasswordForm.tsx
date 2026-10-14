import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
import { TextField } from '../../../shared/ui/TextField';
import { useRequestPasswordReset } from '../hooks/usePasswordRecovery';
import { forgotPasswordSchema } from '../types/passwordRecovery';

/**
 * Pide el enlace para elegir una contraseña nueva (ENG-142). La identidad se
 * prueba con el mail: solo quien abre esa casilla puede seguir.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string>();

  const { mutate, isPending, isSuccess, error } = useRequestPasswordReset();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = forgotPasswordSchema.safeParse({ email });

    if (!result.success) {
      setEmailError(result.error.issues[0]?.message);
      return;
    }

    setEmailError(undefined);
    mutate(result.data);
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
          Revisá tu correo
        </h2>
        {/* Igual que en el registro, no decimos si el email tiene cuenta: este
            formulario no puede servir para averiguar quién está registrado. */}
        <p className="mt-2.5 text-sm leading-[1.7] text-ink">
          Si hay una cuenta con <strong className="font-semibold">{email}</strong>, te mandamos un
          enlace para elegir una contraseña nueva. Puede tardar unos minutos; fijate también en
          spam.
        </p>
        <p className="mt-4 text-[13px] leading-[1.7] text-muted">
          ¿Te acordaste?{' '}
          <Link
            to="/ingresar"
            className="font-semibold text-brand-hover underline-offset-2 hover:underline"
          >
            Iniciá sesión
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <TextField
        id="email"
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="tucorreo@ejemplo.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={emailError}
      />

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-danger">
          {error.message}
        </p>
      )}

      <Button type="submit" fullWidth disabled={isPending} className="mt-2">
        {isPending ? 'Enviando…' : 'Enviarme el enlace'}
      </Button>
    </form>
  );
}
