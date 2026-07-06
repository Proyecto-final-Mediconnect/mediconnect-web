import { useState, type FormEvent } from 'react';
import { Button } from '../../../shared/ui/Button';
import { TextField } from '../../../shared/ui/TextField';
import { useLogin } from '../hooks/useLogin';
import { loginSchema } from '../types/login';

type FieldErrors = Partial<Record<'email' | 'password', string>>;

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const { mutate, isPending, isSuccess, data, error } = useLogin();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const result = loginSchema.safeParse({ email, password });

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
    // La sesión la setea el backend en una cookie httpOnly; el front no
    // manipula tokens (mitiga robo vía XSS).
    mutate(result.data);
  }

  if (isSuccess && data) {
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
          ¡Sesión iniciada!
        </h2>
        <p className="text-muted">
          Bienvenido/a de nuevo,{' '}
          <span className="font-medium text-ink">{data.user.email}</span>.
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
        autoComplete="current-password"
        placeholder="Tu contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
      />

      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-danger"
        >
          {error.message}
        </p>
      )}

      <Button type="submit" fullWidth disabled={isPending} className="mt-2">
        {isPending ? 'Ingresando…' : 'Iniciar sesión'}
      </Button>
    </form>
  );
}
