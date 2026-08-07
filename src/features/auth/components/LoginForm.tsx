import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../../../shared/ui/Button';
import { TextField } from '../../../shared/ui/TextField';
import { getMe } from '../api/getMe';
import { useLogin } from '../hooks/useLogin';
import { SESSION_QUERY_KEY } from '../hooks/useSession';
import { loginSchema } from '../types/login';
import { dashboardPathFor } from '../types/session';

type FieldErrors = Partial<Record<'email' | 'password', string>>;

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const { mutate, isPending, error } = useLogin();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  /** Tras loguearse, el rol de negocio se lee de `GET /me` (viene de la base,
   *  no del JWT) y se redirige al dashboard correspondiente. Si el usuario
   *  había intentado entrar a una ruta privada, vuelve a esa. */
  async function redirectAfterLogin() {
    const user = await getMe();
    queryClient.setQueryData(SESSION_QUERY_KEY, user);

    const from = (location.state as { from?: { pathname?: string } } | null)
      ?.from?.pathname;
    navigate(from ?? dashboardPathFor(user.role), { replace: true });
  }

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
    mutate(result.data, { onSuccess: () => void redirectAfterLogin() });
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
