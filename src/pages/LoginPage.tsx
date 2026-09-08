import { Link } from 'react-router-dom';
import { AuthLayout } from '../features/auth/components/AuthLayout';
import { LoginForm } from '../features/auth/components/LoginForm';

export function LoginPage() {
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
      <LoginForm />
    </AuthLayout>
  );
}
