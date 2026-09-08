import { Link } from 'react-router-dom';
import { AuthLayout } from '../features/auth/components/AuthLayout';
import { ProfessionalRegisterForm } from '../features/auth/components/ProfessionalRegisterForm';

/**
 * Alta de profesional.
 *
 * **El alta es pública a propósito.** El backend crea a todo profesional en
 * `PENDIENTE_VALIDACION_MATRICULA`, y tanto el catálogo como el perfil público
 * filtran por `status = VALIDADO`. O sea que registrarse no habilita a nadie:
 * hasta que una persona valide la matrícula, el perfil no existe para el resto
 * del mundo. Esconder el enlace no agregaría seguridad —el endpoint es público
 * igual— y sí cortaría el único canal por el que entran profesionales.
 *
 * Lo que sí hacía falta era **decirlo antes de pedir los datos**. Antes la
 * validación aparecía recién en el mensaje de éxito, después de completar seis
 * campos: quien no estuviera dispuesto a esperar se enteraba tarde, y quien sí
 * podía pensar que su perfil quedaba publicado al instante.
 */
export function ProfessionalRegisterPage() {
  return (
    <AuthLayout
      eyebrow="Soy profesional"
      title="Tu consultorio, tu agenda y tus pacientes."
      subtitle="Publicás tus servicios y tu disponibilidad, y seguís a tus pacientes entre consulta y consulta."
      aside={<AsideProfesional />}
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
            ¿Buscás atenderte?{' '}
            <Link
              to="/registro"
              className="font-semibold text-brand-hover underline-offset-2 hover:underline"
            >
              Creá tu cuenta de paciente
            </Link>
          </p>
        </div>
      }
    >
      <div className="mb-6 rounded-[12px] border border-line bg-surface-teal px-5 py-4">
        <p className="text-sm font-bold text-brand-deep">Tu matrícula se valida a mano</p>
        <p className="mt-1.5 text-sm leading-[1.6] text-muted">
          Cuando termines, tu cuenta queda creada pero tu perfil todavía no aparece en el catálogo.
          Alguien del equipo controla que la matrícula esté vigente y recién ahí se publica. Te
          avisamos por email cuando pase.
        </p>
      </div>

      <ProfessionalRegisterForm />
    </AuthLayout>
  );
}

/** Panel oscuro propio: los puntos de paciente no le hablan a un profesional. */
function AsideProfesional() {
  const puntos = [
    {
      titulo: 'Agenda que se maneja sola',
      texto: 'Publicás tu disponibilidad y el sistema evita superposiciones.',
    },
    {
      titulo: 'Historia clínica seria',
      texto: 'Registros firmados que no se pueden alterar, con corrección trazable.',
    },
    {
      titulo: 'Tu cartera te sigue',
      texto: 'Si te mudás de ciudad, tus pacientes se mudan con vos.',
    },
  ];

  return (
    <div className="max-w-md">
      <h2 className="font-display text-[34px] leading-[1.15] text-white text-pretty">
        Sin depender de una institución.
      </h2>

      <ul className="mt-8 grid gap-5">
        {puntos.map((punto) => (
          <li key={punto.titulo} className="flex items-start gap-3.5">
            <span
              aria-hidden="true"
              className="relative top-2 h-[7px] w-[7px] flex-none rounded-full bg-brand-bright"
            />
            <div>
              <p className="text-[15px] font-semibold text-white">{punto.titulo}</p>
              <p className="mt-1 text-sm leading-[1.6] text-on-night">{punto.texto}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
