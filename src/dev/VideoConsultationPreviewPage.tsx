import { useState } from 'react';
import { useNow } from '../shared/hooks/useNow';
import { ConsultationSummary } from '../features/video/components/ConsultationSummary';
import { LiveConsultation } from '../features/video/components/LiveConsultation';
import { WaitingRoom } from '../features/video/components/WaitingRoom';
import type { Appointment } from '../features/appointments/types/appointment';
import type { VideoConsultationAccess } from '../features/video/types/dailyRoom';
import { DashboardLayout } from '../pages/DashboardLayout';

/**
 * Banco de pruebas de la videoconsulta. **Solo desarrollo.**
 *
 * La pantalla real necesita un turno propio y, para llegar a la llamada,
 * `DAILY_API_KEY` cargada en el backend. Sin la key el endpoint responde 503, así
 * que la consulta en curso y el resumen no se podían ni mirar mientras se los
 * construía. (La sala de espera sí se ve con solo tener un turno agendado.)
 *
 * Acá se montan **los componentes de verdad** —`LiveConsultation` y
 * `ConsultationSummary`, los mismos que usa la ruta real— con un acceso de
 * juguete y sin pasar por la API. Lo único falso es de dónde salen los datos.
 *
 * La ruta se registra solo si `import.meta.env.DEV`, así que no existe en el
 * build de producción.
 */

/** Marcador del video: el iframe real apunta a la sala de Daily. Un `about:blank`
 *  se ve como un rectángulo negro roto; esto dice qué iría ahí. */
const VIDEO_PLACEHOLDER = `data:text/html,${encodeURIComponent(
  `<body style="margin:0;height:100%;display:grid;place-items:center;background:#04252f;color:#7fa8b8;font:600 14px system-ui">
     Acá va la llamada de Daily
   </body>`,
)}`;

function accesoDeJuguete(role: VideoConsultationAccess['role']): VideoConsultationAccess {
  return {
    appointmentId: 'preview',
    role,
    roomUrl: VIDEO_PLACEHOLDER,
    expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
    counterpart:
      role === 'PROFESIONAL'
        ? { firstName: 'Marina', lastName: 'Sosa' }
        : { firstName: 'Valeria', lastName: 'Ocampo' },
    recording: { enabled: true, mode: 'cloud-audio-only' },
  };
}

type Fase = 'ESPERA' | 'CURSO' | 'CIERRE';

/** Turno de juguete para la sala de espera. Empieza en 12 minutos, así que la
 *  sala abre en 2: alcanza para ver la cuenta regresiva corriendo. */
function turnoDeJuguete(role: VideoConsultationAccess['role']): Appointment {
  const empieza = new Date(Date.now() + 12 * 60_000);

  return {
    id: 'preview',
    scheduledAt: empieza.toISOString(),
    date: empieza.toISOString().slice(0, 10),
    startTime: `${String(empieza.getHours()).padStart(2, '0')}:${String(empieza.getMinutes()).padStart(2, '0')}`,
    durationMinutes: 30,
    price: 12000,
    currency: 'ARS',
    status: 'CONFIRMADO',
    professional:
      role === 'PROFESIONAL'
        ? { id: 'yo', firstName: 'Valeria', lastName: 'Ocampo' }
        : { id: 'p1', firstName: 'Valeria', lastName: 'Ocampo' },
    patient:
      role === 'PROFESIONAL'
        ? { id: 'x1', firstName: 'Marina', lastName: 'Sosa' }
        : { id: 'yo', firstName: 'Marina', lastName: 'Sosa' },
  };
}

export function VideoConsultationPreviewPage() {
  const [role, setRole] = useState<VideoConsultationAccess['role']>('PROFESIONAL');
  // Arranca en la espera: es el orden en que se recorre la pantalla de verdad,
  // y desde ahí el atajo de abajo lleva a la sala.
  const [fase, setFase] = useState<Fase>('ESPERA');
  const [grabando, setGrabando] = useState(true);

  // Arranca 22 minutos atrás para que el cronómetro y el resumen muestren una
  // consulta con duración plausible en vez de 00:00.
  const [joinedAt] = useState(() => new Date(Date.now() - 22 * 60_000));
  /** Fijos al montar: si se recalcularan en cada render la cuenta no avanzaría. */
  const [turno] = useState(() => turnoDeJuguete(role));
  const [abreEn] = useState(() => new Date(Date.now() + 2 * 60_000));
  // Tick de un segundo, para que la cuenta regresiva corra de verdad.
  const now = useNow(1000);

  const access = { ...accesoDeJuguete(role), recording: { enabled: grabando, mode: grabando ? ('cloud-audio-only' as const) : ('off' as const) } };
  const counterpartName = `${access.counterpart!.firstName} ${access.counterpart!.lastName}`;

  return (
    <DashboardLayout barTitle="Videoconsulta — vista de desarrollo">
      <div className="grid gap-5">
        <div className="rounded-[14px] border border-dashed border-line-strong bg-surface p-5">
          <p className="text-[15px] font-bold text-brand-deep">
            Vista de desarrollo, sin backend
          </p>
          <p className="mt-1.5 max-w-[640px] text-[13px] leading-[1.7] text-muted">
            Son los componentes reales de la videoconsulta con datos de juguete. La ruta real
            es <code className="font-mono">/turnos/:id/videoconsulta</code>: se entra con un
            turno propio y, si todavía no es la hora, muestra la sala de espera. Para llegar a
            la llamada hace falta además DAILY_API_KEY en el backend. Esta pantalla no existe
            en el build de producción.
          </p>

          <div className="mt-4 flex flex-wrap gap-5">
            <Selector
              titulo="Rol"
              opciones={[
                { valor: 'PROFESIONAL', label: 'Profesional' },
                { valor: 'PACIENTE', label: 'Paciente' },
              ]}
              activo={role}
              onChange={(v) => setRole(v as VideoConsultationAccess['role'])}
            />
            <Selector
              titulo="Fase"
              opciones={[
                { valor: 'ESPERA', label: 'Sala de espera' },
                { valor: 'CURSO', label: 'En curso' },
                { valor: 'CIERRE', label: 'Resumen' },
              ]}
              activo={fase}
              onChange={(v) => setFase(v as Fase)}
            />
            <Selector
              titulo="Grabación"
              opciones={[
                { valor: 'si', label: 'Grabando' },
                { valor: 'no', label: 'Sin grabar' },
              ]}
              activo={grabando ? 'si' : 'no'}
              onChange={(v) => setGrabando(v === 'si')}
            />
          </div>

          {fase === 'CIERRE' && role === 'PACIENTE' && (
            <p className="mt-4 text-[13px] text-muted">
              El resumen es del profesional: el paciente no llega a esta fase en la app.
            </p>
          )}
        </div>

        {fase === 'ESPERA' ? (
          <>
            <WaitingRoom
              appointment={turno}
              opensAt={abreEn}
              now={now}
              counterpartName={counterpartName}
              counterpartLabel={role === 'PROFESIONAL' ? 'Paciente' : 'Profesional'}
            />

            {/* En la pantalla real no hay ningún botón acá: la sala se abre sola
                al llegar la hora, y ese es justamente el comportamiento que se
                quiere. Este atajo existe solo para no tener que esperar los dos
                minutos de la cuenta regresiva al revisar el diseño. */}
            <SaltoDev onClick={() => setFase('CURSO')}>Entrar a la sala (dev)</SaltoDev>
          </>
        ) : fase === 'CURSO' ? (
          <LiveConsultation
            access={access}
            counterpartName={counterpartName}
            joinedAt={joinedAt}
            onFinish={() => setFase('CIERRE')}
          />
        ) : (
          <ConsultationSummary
            counterpartName={counterpartName}
            joinedAt={joinedAt}
            endedAt={new Date()}
            onBack={() => setFase('CURSO')}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

function Selector({
  titulo,
  opciones,
  activo,
  onChange,
}: {
  titulo: string;
  opciones: { valor: string; label: string }[];
  activo: string;
  onChange: (valor: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
        {titulo}
      </legend>
      <div className="flex gap-1.5">
        {opciones.map((opcion) => (
          <button
            key={opcion.valor}
            type="button"
            onClick={() => onChange(opcion.valor)}
            aria-pressed={activo === opcion.valor}
            className={`rounded-[8px] border px-3.5 py-2 text-[13px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              activo === opcion.valor
                ? 'border-brand-deep bg-brand-deep text-white'
                : 'border-line-strong bg-white text-brand-deep hover:border-brand'
            }`}
          >
            {opcion.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Atajo que no existe en la pantalla real.
 *
 * Va con borde punteado y el sufijo "(dev)" a propósito: tiene que leerse como
 * andamiaje del banco de pruebas y no como un control del producto, para que
 * nadie lo vea en una captura y crea que la sala se abre apretando un botón.
 */
function SaltoDev({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[14px] border border-dashed border-line-strong bg-surface py-4 text-[13px] font-bold text-muted transition-colors hover:border-brand hover:text-brand-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
    >
      {children}
      <span className="ml-2 font-medium text-muted-soft">— saltea la espera</span>
    </button>
  );
}
