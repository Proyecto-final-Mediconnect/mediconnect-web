import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../features/auth/components/AuthLayout';
import { LoginForm } from '../features/auth/components/LoginForm';

export function LoginPage() {
  // Viene de dar de baja la cuenta (ENG-86): se confirma acá, ya sin sesión.
  const [params] = useSearchParams();
  const deBaja = params.get('baja') === '1';
  // RequireAuth manda acá con `state.from` a quien quiso entrar sin sesión
  // (por ejemplo, "Elegir día y horario" desde un perfil público). Sin este
  // aviso parece que el botón llevó al lugar equivocado. LoginForm ya lo
  // devuelve a `from` después de ingresar.
  const location = useLocation();
  const vieneDeOtraPagina = Boolean(
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname,
  );

  return (
    <AuthLayout
      eyebrow="Ingresar"
      title="Entrá a tu cuenta"
      subtitle="La misma cuenta sirve para pacientes y profesionales."
      footer={
        <p>
          ¿Todavía no tenés cuenta?{' '}
          <Link
            to="/registro"
            className="font-semibold text-brand-hover underline-offset-2 hover:underline"
          >
            Creá una gratis
          </Link>
        </p>
      }
    >
      {deBaja && (
        <p
          role="status"
          className="mb-5 rounded-[10px] border border-line bg-surface-teal px-4 py-3 text-[14px] leading-[1.6] text-brand-deep"
        >
          Tu cuenta se dio de baja. Borramos tus datos, salvo los que la ley nos obliga a conservar.
        </p>
      )}
      {vieneDeOtraPagina && !deBaja && (
        <p
          role="status"
          className="mb-5 rounded-[10px] border border-line bg-surface-teal px-4 py-3 text-[14px] leading-[1.6] text-brand-deep"
        >
          Para seguir, ingresá con tu cuenta. Después te llevamos de vuelta a donde estabas.
        </p>
      )}
      <LoginForm />
    </AuthLayout>
  );
}
