import { Link } from 'react-router-dom';
import { formatPrice } from '../lib/formatPrice';
import type { ProfessionalCard } from '../types/catalog';
import { ReservarTurnoCta } from './ReservarTurnoCta';

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
 * **Todo lo que se ve sale de `GET /catalog/professionals` o es un hecho de la
 * plataforma** (ENG-150). El diseño pedía además años de experiencia, bio,
 * calificación y próximo turno; el endpoint no los trae y antes se inventaban.
 * Se sacaron en vez de rellenarlos:
 *
 * - "Videoconsulta" no es un dato del profesional sino de MediConnect, que solo
 *   atiende así. Por eso se puede afirmar sin preguntarle a la API.
 * - "MATRÍCULA VERIFICADA" también es cierto: el backend solo lista
 *   profesionales con `status = 'VALIDADO'`.
 * - La calificación dice que no hay reseñas porque no las hay: ENG-80/ENG-82
 *   todavía no existen. Un número ahí sería mentirle al paciente que elige.
 * - El próximo turno pediría la disponibilidad de cada tarjeta, una consulta por
 *   profesional en el listado. Se ve en el calendario de reserva.
 */
export function ProfessionalCardItem({
  professional,
  basePath,
}: {
  professional: ProfessionalCard;
  /** Raíz del enlace al perfil: cambia según el marco desde el que se llegó. */
  basePath: string;
}) {
  const fullName = `${professional.firstName} ${professional.lastName}`;
  const otherSpecialties = professional.specialties.filter(
    (s) => s.id !== professional.primarySpecialty?.id,
  );

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
            {professional.primarySpecialty?.name ?? 'Especialidad a confirmar'}
          </p>

          {/* Sin bio ni números, la fila de datos pasa a ser de píldoras: dos
              hechos ciertos con el mismo peso visual que las especialidades, en
              vez de un renglón suelto que deja la columna vacía. */}
          <ul className="mt-3.5 flex flex-wrap items-center gap-1.5">
            <li className="rounded-full bg-surface-teal px-2.5 py-1 text-xs font-semibold text-brand-hover">
              Videoconsulta
            </li>
            <li className="rounded-full border border-dashed border-line-strong px-2.5 py-1 text-xs font-medium text-muted">
              Sin reseñas todavía
            </li>
            {otherSpecialties.map((specialty) => (
              <li
                key={specialty.id}
                className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-medium text-muted"
              >
                {specialty.name}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid content-start gap-1.5 border-line-soft lg:border-l lg:pl-[22px]">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-soft">
            Consulta
          </span>
          <span className="text-2xl font-bold text-brand-deep">
            {formatPrice(professional.price, professional.currency)}
          </span>

          <ReservarTurnoCta
            professionalId={professional.id}
            label="Reservar turno"
            layout="mt-2.5"
            botonClassName="rounded-[9px] bg-brand-deep py-3 text-center text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          />
          <Link
            to={`${basePath}/${professional.id}`}
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
