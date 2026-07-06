import { Link } from 'react-router-dom';
import { AuthLayout } from '../features/auth/components/AuthLayout';
import { RegisterForm } from '../features/auth/components/RegisterForm';

export function RegisterPage() {
  return (
    <AuthLayout
      title="Crear cuenta de paciente"
      subtitle="Empezá a cuidar tu salud con MediConnect."
      footer={
        <p>
          ¿Ya tenés cuenta?{' '}
          <Link
            to="/ingresar"
            className="font-semibold text-brand hover:underline"
          >
            Iniciá sesión
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthLayout>
  );
}
