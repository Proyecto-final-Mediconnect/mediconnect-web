import { Link } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
import { formatPrice } from '../lib/formatPrice';
import type { PublicProfessionalProfile } from '../types/catalog';

type Props = {
  profile: PublicProfessionalProfile | undefined;
  isLoading: boolean;
  isError: boolean;
  /** El backend respondió 404: el profesional no existe o no está validado. */
  isNotFound: boolean;
  errorMessage?: string;
  onRetry: () => void;
};

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/** Un título, con el año entre paréntesis solo si el profesional lo cargó. */
function educationLine(institution: string, degree: string, year: number | null): string {
  return year === null ? `${degree} — ${institution}` : `${degree} — ${institution} (${year})`;
}

/**
 * Perfil público de un profesional (ENG-50). Es la pantalla intermedia entre el
 * catálogo y la reserva: acá el paciente decide.
 *
 * "Reservar turno" apunta a una ruta protegida por rol PACIENTE. Si no hay
 * sesión, `RequireAuth` manda a /ingresar guardando el destino, y el login
 * devuelve al calendario. Por eso el botón se muestra siempre y no se esconde
 * ni se deshabilita para el visitante anónimo: esconderlo dejaría al catálogo
 * público sin salida.
 */
export function PublicProfile({
  profile,
  isLoading,
  isError,
  isNotFound,
  errorMessage,
  onRetry,
}: Props) {
  if (isLoading) {
    return (
      <p className="py-16 text-center text-muted" role="status">
        Cargando perfil…
      </p>
    );
  }

  if (isNotFound) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="text-lg font-semibold text-brand-deep">No encontramos este profesional</p>
        <p className="mt-2 text-muted">
          Puede que ya no esté disponible en el catálogo o que el enlace sea incorrecto.
        </p>
        <Link to="/profesionales" className="mt-6 inline-block">
          <Button variant="secondary">Volver al catálogo</Button>
        </Link>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-ink">{errorMessage ?? 'No pudimos cargar el perfil.'}</p>
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    );
  }

  const fullName = `${profile.firstName} ${profile.lastName}`;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-center">
        {profile.photoUrl ? (
          <img
            src={profile.photoUrl}
            alt={`Foto de ${fullName}`}
            className="h-24 w-24 shrink-0 rounded-full object-cover"
          />
        ) : (
          // `aria-hidden` porque el nombre ya está en el encabezado de al lado.
          <div
            aria-hidden="true"
            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-surface-teal text-2xl font-semibold text-brand-hover"
          >
            {initials(profile.firstName, profile.lastName)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-brand-deep">{fullName}</h1>
          <p className="mt-1 text-muted">
            {profile.specialties.length > 0
              ? profile.specialties.map((specialty) => specialty.name).join(' · ')
              : 'Especialidad a confirmar'}
          </p>
          <p className="mt-3 text-xl font-semibold text-ink">
            {formatPrice(profile.price, profile.currency)}
          </p>
        </div>

        <Link
          to={`/profesionales/${profile.id}/turnos`}
          className="shrink-0"
          aria-label={`Reservar turno con ${fullName}`}
        >
          <Button variant="primary">Reservar turno</Button>
        </Link>
      </header>

      {profile.bio && (
        <section className="mt-8 border-t border-slate-200 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Sobre mí</h2>
          {/* `whitespace-pre-line`: la bio se carga en un textarea y los saltos
              de línea que escribió el profesional son parte del texto. */}
          <p className="mt-3 whitespace-pre-line text-ink">{profile.bio}</p>
        </section>
      )}

      {profile.education.length > 0 && (
        <section className="mt-8 border-t border-slate-200 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Formación</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {profile.education.map((item) => (
              <li key={item.id} className="text-ink">
                {educationLine(item.institution, item.degree, item.year)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
