import { Link } from 'react-router-dom';
import { AuthLayout } from '../features/auth/components/AuthLayout';
import { ProfessionalRegisterForm } from '../features/auth/components/ProfessionalRegisterForm';

export function ProfessionalRegisterPage() {
  return (
    <AuthLayout
      title="Crear cuenta profesional"
      subtitle="Ofrecé tus servicios de salud en MediConnect."
      footer={
        <p>
          ¿Ya tenés cuenta?{' '}
          <Link
            to="/ingresar"
            className="font-semibold text-brand hover:underline"
          >
            Iniciá sesión
          </Link>
          {' · '}
          ¿Sos paciente?{' '}
          <Link
            to="/registro"
            className="font-semibold text-brand hover:underline"
          >
            Registrate como paciente
          </Link>
        </p>
      }
    >
      <ProfessionalRegisterForm />
    </AuthLayout>
  );
}
