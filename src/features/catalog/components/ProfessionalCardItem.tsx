import { Link } from 'react-router-dom';
import { formatPrice } from '../lib/formatPrice';
import type { ProfessionalCard } from '../types/catalog';

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function ProfessionalCardItem({ professional }: { professional: ProfessionalCard }) {
  const fullName = `${professional.firstName} ${professional.lastName}`;

  return (
    // La tarjeta entera es el enlace al perfil público (ENG-50): el área
    // clickeable es toda la superficie, no solo el nombre. El `<Link>` va
    // adentro del `<li>` y no al revés, para no romper la relación
    // `<ul>`/`<li>` de la que depende el listado.
    <li className="rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-brand/40 hover:shadow-md focus-within:border-brand/40">
      <Link
        to={`/profesionales/${professional.id}`}
        aria-label={`Ver el perfil de ${fullName}`}
        className="flex gap-4 rounded-2xl p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        {professional.photoUrl ? (
          <img
            src={professional.photoUrl}
            alt={`Foto de ${fullName}`}
            className="h-16 w-16 shrink-0 rounded-full object-cover"
          />
        ) : (
          // Sin foto no se rompe la grilla: el avatar con iniciales ocupa lo
          // mismo. `aria-hidden` porque el nombre ya está en el texto.
          <div
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-surface-teal text-lg font-semibold text-brand-hover"
          >
            {initials(professional.firstName, professional.lastName)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold text-brand-deep">{fullName}</h3>
          <p className="mt-0.5 text-sm text-muted">
            {professional.primarySpecialty?.name ?? 'Especialidad a confirmar'}
          </p>
          <p className="mt-3 font-semibold text-ink">
            {formatPrice(professional.price, professional.currency)}
          </p>
        </div>
      </Link>
    </li>
  );
}
