import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../features/auth/components/AuthLayout';
import { LoginForm } from '../features/auth/components/LoginForm';
import { confirmacionDelRegistro } from '../features/auth/lib/signupConfirmation';

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

  // Se lee una sola vez: enseguida se limpia la URL y el aviso tiene que quedar.
  const [confirmacion] = useState(() => confirmacionDelRegistro(location.hash, location.search));
  const navigate = useNavigate();
  // El fragmento trae los tokens de una sesión de Supabase que la web no usa (la
  // sesión va en cookies, con el ingreso de siempre): no quedan en la barra ni en
  // el historial. La query solo se borra si es la del error.
  const ensuciada = confirmacion !== null;
  useEffect(() => {
    if (!ensuciada) return;
    navigate(
      { pathname: location.pathname, search: deBaja ? '?baja=1' : '', hash: '' },
      { replace: true, state: location.state },
    );
    // Solo al llegar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensuciada]);

  return (
    <AuthLayout
      eyebrow="Ingresar"
      title="Ingresar"
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
      {confirmacion === 'confirmada' && (
        <p
          role="status"
          className="mb-5 rounded-[10px] border border-line bg-surface-teal px-4 py-3 text-[14px] leading-[1.6] text-brand-deep"
        >
          Tu email quedó confirmado. Ya podés ingresar, acá o desde la app de MediConnect.
        </p>
      )}
      {confirmacion === 'vencida' && (
        <p
          role="alert"
          className="mb-5 rounded-[10px] border border-danger/30 bg-danger/5 px-4 py-3 text-[14px] leading-[1.6] text-danger"
        >
          El enlace para confirmar tu cuenta venció o ya se usó. Si ya la confirmaste, ingresá. Si
          no, registrate de nuevo con el mismo email y te mandamos otro.
        </p>
      )}
      {vieneDeOtraPagina && !deBaja && !confirmacion && (
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
