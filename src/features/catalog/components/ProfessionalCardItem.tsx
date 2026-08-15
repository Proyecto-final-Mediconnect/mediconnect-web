import { formatPrice } from '../lib/formatPrice';
import type { ProfessionalCard } from '../types/catalog';

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function ProfessionalCardItem({ professional }: { professional: ProfessionalCard }) {
  const fullName = `${professional.firstName} ${professional.lastName}`;

  return (
    <li className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
    </li>
  );
}
