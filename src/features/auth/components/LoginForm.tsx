import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../../shared/ui/Button';
import { TextField } from '../../../shared/ui/TextField';
import { verifyLoginCode } from '../../mfa/api/mfaApi';
import { MfaCodeField } from '../../mfa/components/MfaCodeField';
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
  /** ENG-88: la contraseña estuvo bien y falta el código de la app autenticadora. */
  const [pideCodigo, setPideCodigo] = useState(false);
  const [codigo, setCodigo] = useState('');

  const { mutate, isPending, error, reset } = useLogin();
  const verificar = useMutation({ mutationFn: verifyLoginCode });
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  /** Tras loguearse, el rol de negocio se lee de `GET /me` (viene de la base,
   *  no del JWT) y se redirige al dashboard correspondiente. Si el usuario
   *  había intentado entrar a una ruta privada, vuelve a esa. */
  async function redirectAfterLogin() {
    const user = await getMe();
    queryClient.setQueryData(SESSION_QUERY_KEY, user);

    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
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
    mutate(result.data, {
      onSuccess: (data) => {
        if (data.mfaRequired) setPideCodigo(true);
        else void redirectAfterLogin();
      },
    });
  }

  if (pideCodigo) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (codigo.length === 6) {
            verificar.mutate(codigo, { onSuccess: () => void redirectAfterLogin() });
          }
        }}
        noValidate
        className="flex flex-col gap-4"
      >
        <div className="grid gap-1">
          <h2 className="text-[16px] font-bold text-brand-deep">Verificación en dos pasos</h2>
          <p className="text-[14px] leading-[1.6] text-muted">
            Abrí tu app autenticadora y escribí el código de seis números de MediConnect.
          </p>
        </div>
        <MfaCodeField
          id="codigo-mfa"
          label="Código"
          value={codigo}
          onChange={(valor) => {
            setCodigo(valor);
            if (verificar.isError) verificar.reset();
          }}
          disabled={verificar.isPending}
        />
        {verificar.isError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-danger">
            {verificar.error.message}
          </p>
        )}
        <Button
          type="submit"
          fullWidth
          disabled={codigo.length !== 6 || verificar.isPending}
          className="mt-2"
        >
          {verificar.isPending ? 'Verificando…' : 'Verificar e ingresar'}
        </Button>
        <button
          type="button"
          onClick={() => {
            setPideCodigo(false);
            setCodigo('');
            verificar.reset();
            reset();
          }}
          className="self-center text-[13px] font-semibold text-brand-hover underline-offset-2 hover:underline"
        >
          Volver a ingresar con otra cuenta
        </button>
      </form>
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
      <Link
        to="/recuperar-contrasena"
        className="-mt-2 self-end text-[13px] font-semibold text-brand-hover underline-offset-2 hover:underline"
      >
        ¿Olvidaste tu contraseña?
      </Link>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-danger">
          {error.message}
        </p>
      )}

      <Button type="submit" fullWidth disabled={isPending} className="mt-2">
        {isPending ? 'Ingresando…' : 'Iniciar sesión'}
      </Button>
    </form>
  );
}
