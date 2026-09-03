import { Link } from 'react-router-dom';
import { formatPrice } from '../lib/formatPrice';
import { describeNextSlot, mockDetailsFor } from '../lib/mockProfessionalDetails';
import type { ProfessionalCard } from '../types/catalog';

function initials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Tarjeta del catálogo, con el diseño del canvas: retrato, datos y una columna
 * de decisión a la derecha con el precio y las dos acciones.
 *
 * Antes la tarjeta entera era un enlace. Ahora tiene dos destinos distintos
 * —reservar y ver el perfil—, así que las acciones son explícitas. Es además
 * mejor para lectores de pantalla: un enlace que envuelve a otros controles
 * obliga a recorrer todo el contenido para llegar a ellos.
 *
 * **Matrícula, experiencia, bio, calificación, reseñas, modalidad y próximo
 * turno son datos inventados** (ver `lib/mockProfessionalDetails`). El endpoint
 * del catálogo no los devuelve. Están para que la pantalla se vea como el
 * diseño; se reemplazan cuando existan los campos reales.
 */
export function ProfessionalCardItem({ professional }: { professional: ProfessionalCard }) {
  const fullName = `${professional.firstName} ${professional.lastName}`;
  const mock = mockDetailsFor(professional);

  return (
    <li className="rounded-[14px] border border-line bg-white p-6 transition-colors hover:border-brand/40">
      <div className="grid gap-5 sm:grid-cols-[84px_minmax(0,1fr)] lg:grid-cols-[84px_minmax(0,1fr)_216px]">
        {professional.photoUrl ? (
          <img
            src={professional.photoUrl}
            alt={`Foto de ${fullName}`}
            className="h-[84px] w-[84px] shrink-0 rounded-[10px] object-cover"
          />
        ) : (
          // Sin foto no se rompe la grilla: el avatar con iniciales ocupa lo
          // mismo. `aria-hidden` porque el nombre ya está en el texto.
          <div
            aria-hidden="true"
            className="flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-[10px] bg-surface-teal text-2xl font-bold text-brand-hover"
          >
            {initials(professional.firstName, professional.lastName)}
          </div>
        )}

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-[19px] font-bold text-brand-deep">{fullName}</h3>
            <span className="rounded-[5px] bg-surface-teal px-2.5 py-[5px] text-[10px] font-bold tracking-[0.08em] text-brand-hover">
              MATRÍCULA VERIFICADA
            </span>
          </div>

          <p className="mt-1.5 text-sm font-medium text-muted">
            <span>{professional.primarySpecialty?.name ?? 'Especialidad a confirmar'}</span>
            <span> · {mock.yearsOfExperience} años de experiencia</span>
          </p>

          <p className="mt-[3px] text-xs font-semibold tracking-[0.04em] text-muted-soft">
            MN {mock.licenseNumber}
          </p>

          <p className="mt-2.5 max-w-[520px] text-sm leading-[1.6] text-muted">{mock.bio}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-[18px] gap-y-2">
            <span className="text-[13px] font-medium text-ink">
              <span className="font-bold text-brand-deep">{mock.rating.toFixed(1)}</span>{' '}
              ({mock.reviewCount} consultas reales)
            </span>
            <span className="text-[13px] font-medium text-muted">{mock.modality}</span>
          </div>

          {professional.specialties.length > 1 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {professional.specialties
                .filter((s) => s.id !== professional.primarySpecialty?.id)
                .map((specialty) => (
                  <li
                    key={specialty.id}
                    className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted"
                  >
                    {specialty.name}
                  </li>
                ))}
            </ul>
          )}
        </div>

        <div className="grid content-start gap-1.5 border-line-soft lg:border-l lg:pl-[22px]">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-soft">
            Consulta
          </span>
          <span className="text-2xl font-bold text-brand-deep">
            {formatPrice(professional.price, professional.currency)}
          </span>

          <span className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-soft">
            Próximo turno
          </span>
          <span className="text-[15px] font-semibold text-brand-hover">
            {describeNextSlot(mock.nextSlotInDays)}
          </span>

          <Link
            to={`/profesionales/${professional.id}/turnos`}
            className="mt-2.5 rounded-[9px] bg-brand-deep py-3 text-center text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Reservar turno
          </Link>
          <Link
            to={`/profesionales/${professional.id}`}
            aria-label={`Ver el perfil de ${fullName}`}
            className="rounded-[9px] border border-line-strong bg-white py-3 text-center text-sm font-bold text-brand-deep transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Ver perfil
          </Link>
        </div>
      </div>
    </li>
  );
}
