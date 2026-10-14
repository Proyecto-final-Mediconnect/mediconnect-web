import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../features/auth/components/AuthLayout';
import { ResetPasswordForm } from '../features/auth/components/ResetPasswordForm';

/**
 * Destino del enlace del mail de recuperación (ENG-142):
 * `/restablecer-contrasena?token_hash=…&type=recovery`.
 *
 * Abrir la página **no** consume el token —recién se canjea al guardar la
 * contraseña nueva—, así que un escáner de links del correo no lo quema.
 *
 * El token se lee una sola vez y se borra de la dirección, para que no quede en
 * el historial del navegador. Mientras la página está abierta, además, no se
 * manda `Referer`: ningún recurso externo se entera de la URL.
 */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  // Se congela al montar: después de limpiar la URL, `params` ya no lo tiene.
  const [tokenHash] = useState(() =>
    params.get('type') === 'recovery' ? params.get('token_hash') : null,
  );

  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState(window.history.state, '', window.location.pathname);
    }

    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  return (
    <AuthLayout
      eyebrow="Recuperar contraseña"
      title="Elegí una contraseña nueva"
      subtitle="Cuando la guardes, vas a tener que ingresar de nuevo en todos tus dispositivos."
    >
      {tokenHash ? (
        <ResetPasswordForm tokenHash={tokenHash} />
      ) : (
        <div role="alert" className="rounded-[14px] border border-line bg-white p-7">
          <h2 className="font-display text-[22px] leading-[1.2] text-brand-deep">
            Este enlace no sirve
          </h2>
          <p className="mt-2.5 text-sm leading-[1.7] text-ink">
            Le falta información. Abrí de nuevo el enlace tal cual llegó al mail, o pedí uno nuevo.
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
