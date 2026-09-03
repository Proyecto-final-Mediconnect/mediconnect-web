import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
import { formatPrice } from '../lib/formatPrice';
import {
  mockDetailsFor,
  mockReviewsFor,
  mockServicesFor,
  type MockService,
} from '../lib/mockProfessionalDetails';
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

/** Pasos de la reserva, tal como los nombra el diseño. */
const PASOS = ['Servicio', 'Horario', 'Revisión', 'Pago', 'Listo'];

/**
 * Perfil público de un profesional (ENG-50), con el diseño del canvas.
 *
 * Es la pantalla intermedia entre el catálogo y la reserva: acá el paciente
 * decide. Por eso la columna de reserva queda pegada al hacer scroll — la
 * decisión tiene que estar a mano mientras se leen los servicios y las reseñas.
 *
 * "Elegir día y horario" apunta a una ruta protegida por rol PACIENTE. Si no hay
 * sesión, `RequireAuth` manda a /ingresar guardando el destino, y el login
 * devuelve al calendario. Por eso el botón se muestra siempre y no se esconde ni
 * se deshabilita para el visitante anónimo: esconderlo dejaría al catálogo
 * público sin salida.
 *
 * **Qué es real y qué no.** `GET /professionals/:id` devuelve nombre, foto, bio,
 * especialidades, formación y precio. Matrícula, años de experiencia,
 * calificación, reseñas, modalidad y la lista de servicios son inventados (ver
 * `lib/mockProfessionalDetails`). El primer servicio usa el precio real, así que
 * lo que se ve al abrir el perfil es lo que el profesional publicó.
 *
 * La **formación** no está en el canvas, pero sí en la API. Se muestra igual: es
 * dato verdadero y es de lo que más pesa al elegir a quién te atiende.
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
      <div className="rounded-[14px] border border-dashed border-line-strong bg-white p-10 text-center">
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
      <div className="rounded-[14px] border border-line bg-white p-8 text-center">
        <p className="text-ink">{errorMessage ?? 'No pudimos cargar el perfil.'}</p>
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    );
  }

  return <ProfileBody profile={profile} />;
}

function ProfileBody({ profile }: { profile: PublicProfessionalProfile }) {
  const fullName = `${profile.firstName} ${profile.lastName}`;
  const mock = mockDetailsFor(profile);
  const servicios = mockServicesFor(profile.price);
  const resenas = mockReviewsFor(profile);

  const [elegido, setElegido] = useState<MockService>(servicios[0]);

  return (
    <div>
      <Link
        to="/profesionales"
        className="text-xs font-semibold tracking-[0.08em] text-muted transition-colors hover:text-brand-deep"
      >
        ← BUSCAR PROFESIONALES
      </Link>

      <h1 className="font-display mt-3.5 text-[32px] leading-[1.1] text-brand-deep lg:text-[40px]">
        {fullName}
      </h1>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4">
          <Cabecera profile={profile} fullName={fullName} mock={mock} />
          <Servicios servicios={servicios} elegido={elegido} onElegir={setElegido} />
          {profile.education.length > 0 && <Formacion education={profile.education} />}
          <Resenas resenas={resenas} mock={mock} />
        </div>

        <PanelReserva profile={profile} elegido={elegido} mock={mock} />
      </div>
    </div>
  );
}

type Mock = ReturnType<typeof mockDetailsFor>;

function Cabecera({
  profile,
  fullName,
  mock,
}: {
  profile: PublicProfessionalProfile;
  fullName: string;
  mock: Mock;
}) {
  return (
    <section className="grid gap-6 rounded-[14px] border border-line bg-white p-7 sm:grid-cols-[120px_minmax(0,1fr)]">
      {profile.photoUrl ? (
        <img
          src={profile.photoUrl}
          alt={`Foto de ${fullName}`}
          className="h-36 w-[120px] rounded-[10px] border border-line object-cover"
        />
      ) : (
        // `aria-hidden` porque el nombre ya está en el encabezado de al lado.
        <div
          aria-hidden="true"
          className="flex h-36 w-[120px] items-center justify-center rounded-[10px] border border-line bg-surface-teal text-3xl font-bold text-brand-hover"
        >
          {initials(profile.firstName, profile.lastName)}
        </div>
      )}

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* El canvas repite el nombre acá además del <h1>. Se conserva la
              lectura visual, pero NO como encabezado: dos headings con el mismo
              texto le hacen recorrer lo mismo dos veces a un lector de pantalla,
              y no aportan un nivel de estructura nuevo. */}
          <p className="text-[22px] font-bold text-brand-deep">{fullName}</p>
          <span className="rounded-[5px] bg-surface-teal px-2.5 py-[5px] text-[10px] font-bold tracking-[0.08em] text-brand-hover">
            MATRÍCULA VERIFICADA
          </span>
        </div>

        <p className="mt-1.5 text-[15px] font-medium text-muted">
          <span>
            {profile.specialties.length > 0
              ? profile.specialties.map((s) => s.name).join(' · ')
              : 'Especialidad a confirmar'}
          </span>
          <span> · {mock.yearsOfExperience} años de experiencia</span>
        </p>

        <p className="mt-[3px] text-xs font-semibold tracking-[0.04em] text-muted-soft">
          MN {mock.licenseNumber}
        </p>

        {profile.bio && (
          // `whitespace-pre-line`: la bio se carga en un textarea y los saltos
          // de línea que escribió el profesional son parte del texto.
          <p className="mt-4 max-w-[560px] whitespace-pre-line text-base leading-[1.7] text-ink text-pretty">
            {profile.bio}
          </p>
        )}

        <dl className="mt-5 flex flex-wrap gap-x-11 gap-y-4">
          <Dato titulo="Calificación">
            {mock.rating.toFixed(1).replace('.', ',')} · {mock.reviewCount} reseñas
          </Dato>
          <Dato titulo="Consulta">{formatPrice(profile.price, profile.currency)}</Dato>
          <Dato titulo="Modalidad">{mock.modality}</Dato>
        </dl>
      </div>
    </section>
  );
}

function Dato({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-soft">
        {titulo}
      </dt>
      <dd className="mt-1.5 text-[17px] font-bold text-brand-deep">{children}</dd>
    </div>
  );
}

function Tarjeta({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[14px] border border-line bg-white">
      <header className="border-b border-line-soft px-6 py-5">
        <h2 className="text-[17px] font-bold text-brand-deep">{titulo}</h2>
        {descripcion && <p className="mt-1.5 text-[13px] text-muted">{descripcion}</p>}
      </header>
      {children}
    </section>
  );
}

function Servicios({
  servicios,
  elegido,
  onElegir,
}: {
  servicios: MockService[];
  elegido: MockService;
  onElegir: (s: MockService) => void;
}) {
  return (
    <Tarjeta titulo="Servicios">
      <div className="grid gap-2.5 px-6 py-[18px]">
        {servicios.map((servicio) => {
          const activo = servicio.id === elegido.id;

          return (
            <button
              key={servicio.id}
              type="button"
              aria-pressed={activo}
              onClick={() => onElegir(servicio)}
              className={`flex flex-wrap items-center justify-between gap-4 rounded-[10px] border px-4 py-3.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                activo ? 'border-brand bg-surface-teal' : 'border-line hover:border-brand/50'
              }`}
            >
              <span className="grid gap-1">
                <span className="flex flex-wrap items-center gap-2.5">
                  <span className="text-base font-bold text-brand-deep">{servicio.nombre}</span>
                  {activo && (
                    <span className="rounded-[5px] bg-brand-deep px-2 py-1 text-[10px] font-bold tracking-[0.08em] text-white">
                      ELEGIDO
                    </span>
                  )}
                </span>
                <span className="text-sm text-muted">{servicio.detalle}</span>
              </span>

              <span className="grid gap-0.5 text-right">
                <span className="text-[17px] font-bold text-brand-deep">
                  {servicio.precio === null ? 'A confirmar' : formatPrice(servicio.precio, 'ARS')}
                </span>
                <span className="text-[13px] font-medium text-muted-soft">
                  {servicio.duracion}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </Tarjeta>
  );
}

function Formacion({ education }: { education: PublicProfessionalProfile['education'] }) {
  return (
    <Tarjeta titulo="Formación">
      <ul className="grid gap-px bg-line-soft">
        {education.map((item) => (
          <li key={item.id} className="bg-white px-6 py-4 text-[15px] text-ink">
            {educationLine(item.institution, item.degree, item.year)}
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}

function Resenas({ resenas, mock }: { resenas: ReturnType<typeof mockReviewsFor>; mock: Mock }) {
  return (
    <Tarjeta
      titulo="Reseñas verificadas"
      descripcion="Solo pueden dejar reseña las personas que tuvieron una consulta."
    >
      <ul className="grid gap-px bg-line-soft">
        {resenas.map((resena) => (
          <li key={resena.autor} className="bg-white px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-bold text-brand-deep">{resena.autor}</span>
              <span className="text-xs font-semibold tracking-[0.06em] text-muted-soft">
                {resena.puntaje} · {resena.fecha}
              </span>
            </div>
            <p className="mt-2 text-sm leading-[1.65] text-ink">{resena.texto}</p>
          </li>
        ))}
      </ul>

      <p className="border-t border-line-soft px-6 py-4 text-[13px] text-muted">
        {mock.reviewCount} reseñas en total.
      </p>
    </Tarjeta>
  );
}

function PanelReserva({
  profile,
  elegido,
  mock,
}: {
  profile: PublicProfessionalProfile;
  elegido: MockService;
  mock: Mock;
}) {
  const fullName = `${profile.firstName} ${profile.lastName}`;

  return (
    <aside className="overflow-hidden rounded-[14px] border border-brand/40 bg-white lg:sticky lg:top-24">
      <div className="border-b border-line-soft px-[22px] py-5">
        <h2 className="text-[17px] font-bold text-brand-deep">Reservar consulta</h2>

        <ol className="mt-[18px] flex justify-between">
          {PASOS.map((paso, i) => {
            const activo = i === 0;

            return (
              <li key={paso} className="grid justify-items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    activo ? 'bg-brand-deep text-white' : 'bg-line-soft text-muted-soft'
                  }`}
                >
                  {i + 1}
                </span>
                <span
                  className={`text-[11px] font-semibold tracking-[0.04em] ${
                    activo ? 'text-brand-deep' : 'text-muted-soft'
                  }`}
                >
                  {paso}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="grid gap-3.5 px-[22px] py-5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          Paso 1 de {PASOS.length} · elegí el servicio
        </span>

        <dl className="grid gap-2.5 text-sm font-medium text-ink">
          <Fila titulo="Servicio">
            <span className="font-bold text-brand-deep">{elegido.nombre}</span>
          </Fila>
          <Fila titulo="Duración">{elegido.duracion}</Fila>
          <Fila titulo="Modalidad">{mock.modality}</Fila>
        </dl>

        <div className="h-px bg-line-soft" />

        <div className="flex items-baseline justify-between pt-1.5">
          <span className="text-[13px] font-semibold text-muted">Total</span>
          <span className="text-[26px] font-bold text-brand-deep">
            {elegido.precio === null ? 'A confirmar' : formatPrice(elegido.precio, 'ARS')}
          </span>
        </div>

        <Link
          to={`/profesionales/${profile.id}/turnos`}
          aria-label={`Reservar turno con ${fullName}`}
          className="w-full rounded-[10px] bg-brand py-[15px] text-center text-[15px] font-bold text-ink-deep transition-colors hover:bg-brand-hover hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          Elegir día y horario
        </Link>

        <p className="text-xs leading-[1.6] text-muted-soft">
          Cancelación sin costo hasta 24 h antes del turno.
        </p>
      </div>
    </aside>
  );
}

function Fila({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{titulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}
