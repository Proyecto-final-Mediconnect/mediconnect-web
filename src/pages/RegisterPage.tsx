import { Link } from 'react-router-dom';
import { AuthLayout } from '../features/auth/components/AuthLayout';
import { RegisterForm } from '../features/auth/components/RegisterForm';

export function RegisterPage() {
  return (
    <AuthLayout
      eyebrow="Crear cuenta"
      title="Empezá a cuidar tu salud."
      subtitle="Crear la cuenta es gratis. Pagás solamente la consulta que reservás."
      footer={
        <div className="grid gap-2">
          <p>
            ¿Ya tenés cuenta?{' '}
            <Link
              to="/ingresar"
              className="font-semibold text-brand-hover underline-offset-2 hover:underline"
            >
              Ingresá
            </Link>
          </p>
          <p>
            ¿Sos profesional de la salud?{' '}
            <Link
              to="/registro/profesional"
              className="font-semibold text-brand-hover underline-offset-2 hover:underline"
            >
              Publicá tu perfil
            </Link>
          </p>
        </div>
      }
    >
      <RegisterForm />
    </AuthLayout>
  );
}
