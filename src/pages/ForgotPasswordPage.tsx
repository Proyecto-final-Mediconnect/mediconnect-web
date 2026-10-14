import { Link } from 'react-router-dom';
import { AuthLayout } from '../features/auth/components/AuthLayout';
import { ForgotPasswordForm } from '../features/auth/components/ForgotPasswordForm';

export function ForgotPasswordPage() {
  return (
    <AuthLayout
      eyebrow="Recuperar contraseña"
      title="¿Olvidaste tu contraseña?"
      subtitle="Escribí el email de tu cuenta y te mandamos un enlace para elegir una nueva."
      footer={
        <p>
          ¿Te acordaste?{' '}
          <Link
            to="/ingresar"
            className="font-semibold text-brand-hover underline-offset-2 hover:underline"
          >
            Volver a ingresar
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
