import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
import { TextField } from '../../../shared/ui/TextField';
import { useRegisterPatient } from '../hooks/useRegisterPatient';
import { registerPatientSchema } from '../types/register';

type FieldErrors = Partial<
  Record<'email' | 'password' | 'passwordConfirmation', string>
>;

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
        className="rounded-xl border border-brand/30 bg-surface-teal p-6 text-center"
      >
        <div
          aria-hidden
          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-2xl text-white"
        >
          ✓
        </div>
        <h2 className="mb-2 text-xl font-semibold text-brand-deep">
          Revisá tu correo
        </h2>
        <p className="text-muted">
          Si tu email todavía no estaba registrado, te enviamos un enlace para
          confirmar tu cuenta. Si ya tenías una cuenta, podés{' '}
          <Link
            to="/ingresar"
            className="font-semibold text-brand hover:underline"
          >
            iniciar sesión
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
        placeholder="Mínimo 8 caracteres"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        {...passwordToggle}
      />
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
