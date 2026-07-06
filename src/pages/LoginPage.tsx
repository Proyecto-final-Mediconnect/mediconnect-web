import { Link } from 'react-router-dom';
import { AuthLayout } from '../features/auth/components/AuthLayout';
import { LoginForm } from '../features/auth/components/LoginForm';

export function LoginPage() {
  return (
    <AuthLayout
      title="Iniciá sesión"
      subtitle="Accedé a tu cuenta de paciente."
      footer={
        <p>
          ¿No tenés cuenta?{' '}
          <Link
            to="/registro"
            className="font-semibold text-brand hover:underline"
          >
            Creá una
          </Link>
        </p>
      }
    >
      <LoginForm />
    </AuthLayout>
  );
}
