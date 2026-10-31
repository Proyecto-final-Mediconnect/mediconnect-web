import { Link } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
import { formatPrice } from '../lib/formatPrice';
import type { PublicProfessionalProfile } from '../types/catalog';
import { ReservarTurnoCta } from './ReservarTurnoCta';
import { PolicyNotice } from '../../cancellation-policy/components/PolicyNotice';

type Props = {
  /** Raíz del catálogo del que se vino, para el enlace de volver. Público por
   *  defecto; desde adentro de la app es `/buscar`. */
  basePath?: string;
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
 * MediConnect solo atiende por videoconsulta, así que es el único servicio y la
 * única modalidad. No es un dato del profesional que falte en la API: es un
 * hecho de la plataforma, y por eso se puede escribir acá.
 */
const SERVICIO = 'Videoconsulta';

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
 * **Todo sale de la API o no se muestra** (ENG-150). `GET /professionals/:id`
 * devuelve nombre, foto, bio, especialidades, formación y precio, y eso es lo que
 * hay. Antes se inventaban años de experiencia, calificación, reseñas, dos
 * servicios extra y su duración; se sacaron. Las reseñas muestran que no hay
 * ninguna —ENG-80/ENG-82 todavía no existen— y el servicio es uno solo, la
 * videoconsulta, con el precio que publicó el profesional.
 *
 * El "próximo turno" tampoco está: `GET /professionals/:id/availability` pide
 * sesión, y este perfil lo ve también el visitante anónimo. Para él la consulta
 * daría 401 y el dato aparecería o no según quién mire. El horario se elige en
 * el paso siguiente, que ya muestra la disponibilidad real.
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
  basePath = '/profesionales',
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
        <Link to={basePath} className="mt-6 inline-block">
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

  return <ProfileBody profile={profile} basePath={basePath} />;
}

function ProfileBody({
  profile,
  basePath,
}: {
  profile: PublicProfessionalProfile;
  basePath: string;
}) {
  const fullName = `${profile.firstName} ${profile.lastName}`;
  const precio = formatPrice(profile.price, profile.currency);

  return (
    <div>
      <Link
        to={basePath}
        className="text-xs font-semibold tracking-[0.08em] text-muted transition-colors hover:text-brand-deep"
      >
        ← BUSCAR PROFESIONALES
      </Link>

      <h1 className="font-display mt-3.5 text-[32px] leading-[1.1] text-brand-deep lg:text-[40px]">
        {fullName}
      </h1>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4">
          <Cabecera profile={profile} fullName={fullName} precio={precio} />
          <Servicios precio={precio} />
          {profile.education.length > 0 && <Formacion education={profile.education} />}
          <Resenas />
        </div>

        <PanelReserva profile={profile} fullName={fullName} precio={precio} />
      </div>
    </div>
  );
}

function Cabecera({
  profile,
  fullName,
  precio,
}: {
  profile: PublicProfessionalProfile;
  fullName: string;
  precio: string;
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
          {profile.specialties.length > 0
            ? profile.specialties.map((s) => s.name).join(' · ')
            : 'Especialidad a confirmar'}
        </p>

        {profile.bio && (
          // `whitespace-pre-line`: la bio se carga en un textarea y los saltos
          // de línea que escribió el profesional son parte del texto.
          <p className="mt-4 max-w-[560px] whitespace-pre-line text-base leading-[1.7] text-ink text-pretty">
            {profile.bio}
          </p>
        )}

        {/* Sin calificación: no hay reseñas de las que sacarla. El hueco no se
            nota porque el bloque de datos es una fila flexible, no una grilla
            de tres columnas fijas. */}
        <dl className="mt-5 flex flex-wrap gap-x-11 gap-y-4">
          <Dato titulo="Consulta">{precio}</Dato>
          <Dato titulo="Modalidad">{SERVICIO}</Dato>
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

/**
 * El único servicio. Ya no es un botón: con una sola opción no hay nada que
 * elegir, y un control que no cambia nada confunde más de lo que ayuda. Queda
 * marcado como elegido para que se lea igual que el primer paso de la reserva.
 */
function Servicios({ precio }: { precio: string }) {
  return (
    <Tarjeta titulo="Servicios">
      <div className="px-6 py-[18px]">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[10px] border border-brand bg-surface-teal px-4 py-3.5">
          <div className="grid gap-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-base font-bold text-brand-deep">{SERVICIO}</span>
              <span className="rounded-[5px] bg-brand-deep px-2 py-1 text-[10px] font-bold tracking-[0.08em] text-white">
                ELEGIDO
              </span>
            </div>
            <span className="text-sm text-muted">
              Consulta por video desde la plataforma, sin moverte de tu casa.
            </span>
          </div>

          <span className="text-[17px] font-bold text-brand-deep">{precio}</span>
        </div>
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

/**
 * Estado vacío, no una sección escondida: que el paciente vea que todavía no hay
 * reseñas es información en sí, y esconder el bloque haría pensar que el perfil
 * está incompleto. Cuando ENG-80/ENG-82 sirvan reseñas, se listan acá.
 */
function Resenas() {
  return (
    <Tarjeta titulo="Reseñas">
      <div className="grid justify-items-center gap-1.5 px-6 py-8 text-center">
        <p className="text-[15px] font-semibold text-brand-deep">Todavía no tiene reseñas</p>
        <p className="max-w-[380px] text-[13px] leading-[1.6] text-muted">
          Solo va a poder dejar una reseña quien haya tenido una consulta con este profesional.
        </p>
      </div>
    </Tarjeta>
  );
}

function PanelReserva({
  profile,
  fullName,
  precio,
}: {
  profile: PublicProfessionalProfile;
  fullName: string;
  precio: string;
}) {
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

        {/* La duración se fue con los servicios inventados: la define cada
            horario de la agenda, y se ve al elegirlo en el paso siguiente. */}
        <dl className="grid gap-2.5 text-sm font-medium text-ink">
          <Fila titulo="Profesional">{fullName}</Fila>
          <Fila titulo="Servicio">
            <span className="font-bold text-brand-deep">{SERVICIO}</span>
          </Fila>
        </dl>

        <div className="h-px bg-line-soft" />

        <div className="flex items-baseline justify-between pt-1.5">
          <span className="text-[13px] font-semibold text-muted">Total</span>
          <span className="text-[26px] font-bold text-brand-deep">{precio}</span>
        </div>

        <ReservarTurnoCta
          professionalId={profile.id}
          label="Elegir día y horario"
          ariaLabel={`Reservar turno con ${fullName}`}
          layout="w-full"
          botonClassName="rounded-[10px] bg-brand py-[15px] text-center text-[15px] font-bold text-ink-deep transition-colors hover:bg-brand-hover hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        />

        <PolicyNotice policy={profile.cancellationPolicy} />
      </div>
    </aside>
  );
}

function Fila({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{titulo}</dt>
      {/* A la derecha también al cortar en dos líneas: un nombre largo no se
          despega de su columna. */}
      <dd className="text-right">{children}</dd>
    </div>
  );
}
