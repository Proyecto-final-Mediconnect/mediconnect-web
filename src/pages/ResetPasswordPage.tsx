import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../features/auth/components/AuthLayout';
import { ResetPasswordForm } from '../features/auth/components/ResetPasswordForm';

/**
 * Destino del enlace del mail de recuperación (ENG-142):
 * `/restablecer-contrasena?token_hash=…&type=recovery`.
 *
 * Abrir la página **no** consume el token —recién se canjea al guardar la
 * contraseña nueva—, así que un escáner de links del correo no lo quema.
 */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const tokenHash = params.get('token_hash');
  const valido = Boolean(tokenHash) && params.get('type') === 'recovery';

  return (
    <AuthLayout
      eyebrow="Recuperar contraseña"
      title="Elegí una contraseña nueva"
      subtitle="Cuando la guardes, vas a tener que ingresar de nuevo en todos tus dispositivos."
    >
      {valido && tokenHash ? (
        <ResetPasswordForm tokenHash={tokenHash} />
      ) : (
        <div role="alert" className="rounded-[14px] border border-line bg-white p-7">
          <h2 className="font-display text-[22px] leading-[1.2] text-brand-deep">
            Este enlace no sirve
          </h2>
          <p className="mt-2.5 text-sm leading-[1.7] text-ink">
            Le falta información. Abrí el enlace tal cual llegó al mail, o pedí uno nuevo.
          </p>
          <Link
            to="/recuperar-contrasena"
            className="mt-4 inline-block text-sm font-semibold text-brand-hover underline-offset-2 hover:underline"
          >
            Pedir un enlace nuevo
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
