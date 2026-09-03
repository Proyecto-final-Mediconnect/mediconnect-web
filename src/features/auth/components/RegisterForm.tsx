import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
import { TextField } from '../../../shared/ui/TextField';
import { PasswordRules } from './PasswordRules';
import { useRegisterPatient } from '../hooks/useRegisterPatient';
import { registerPatientSchema } from '../types/register';

type FieldErrors = Partial<Record<'email' | 'password' | 'passwordConfirmation', string>>;

export function RegisterForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const passwordToggle = {
    passwordVisible: showPasswords,
    onTogglePasswordVisibility: () => setShowPasswords((v) => !v),
  };

  const { mutate, isPending, isSuccess, error } = useRegisterPatient();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = registerPatientSchema.safeParse({
      email,
      password,
      passwordConfirmation,
    });

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
    mutate(result.data);
  }

  if (isSuccess) {
    return (
      <div
        role="status"
        className="rounded-[14px] border border-brand/30 bg-surface-teal p-7"
      >
        {/* El tilde va en azul profundo y no en teal: el blanco sobre #14b8a6 da
            2,2:1, por debajo del mínimo de WCAG AA. */}
        <div
          aria-hidden
          className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-deep text-xl text-white"
        >
          ✓
        </div>
        <h2 className="font-display mt-5 text-[26px] leading-[1.2] text-brand-deep">
          Revisá tu correo
        </h2>
        <p className="mt-2.5 text-sm leading-[1.7] text-ink">
          Si tu email todavía no estaba registrado, te enviamos un enlace para confirmar tu
          cuenta.
        </p>
        {/* El mensaje es deliberadamente ambiguo sobre si el email existía: decir
            "ya tenés cuenta" convertiría este formulario en un detector de
            usuarios registrados. */}
        <p className="mt-4 text-[13px] leading-[1.7] text-muted">
          ¿Ya tenías cuenta?{' '}
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
        error={errors.email}
      />
      <TextField
        id="password"
        name="password"
        label="Contraseña"
        type="password"
        autoComplete="new-password"
        placeholder="Tu contraseña"
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
        <p role="alert" className="text-sm text-danger">
          {error.message}
        </p>
      )}

      <Button type="submit" fullWidth disabled={isPending} className="mt-2">
        {isPending ? 'Creando cuenta…' : 'Crear cuenta'}
      </Button>
    </form>
  );
}
