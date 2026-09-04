import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNow } from '../../../shared/hooks/useNow';
import { Button } from '../../../shared/ui/Button';
import { useMyAppointments } from '../../appointments/hooks/useAppointments';
import { counterpartOf } from '../../appointments/lib/myAppointments';
import { useSession } from '../../auth/hooks/useSession';
import { useVideoConsultationAccess } from '../hooks/useVideoConsultation';
import { joinStateOf } from '../lib/joinWindow';
import { ConsultationSummary } from './ConsultationSummary';
import { LiveConsultation } from './LiveConsultation';
import { WaitingRoom } from './WaitingRoom';

/**
 * Videoconsulta de un turno (ENG-56), con el diseño del canvas.
 *
 * Pide la sala al backend al montarse y después reparte entre las dos fases que
 * dibuja el canvas: la consulta en curso y el resumen de cierre. Todo lo que
 * decide si se puede entrar —el rol, el estado del turno, la ventana horaria— lo
 * resuelve el servidor: acá solo se muestra el resultado. Por eso los errores se
 * muestran tal cual vienen, incluidos los de negocio ("la sala se abre 10
 * minutos antes"), que son la explicación correcta para el usuario.
 *
 * El cierre es un cambio de vista, no un fin de llamada: **el iframe se
 * desmonta**, así que volver "a la consulta en curso" vuelve a cargar el
 * Prebuilt con la misma URL tokenizada. Eso funciona mientras la sala no haya
 * expirado, que es exactamente el caso en el que un profesional vuelve atrás
 * para chequear algo antes de firmar.
 *
 * **Se puede entrar antes de hora.** Si la ventana todavía no abrió se muestra la
 * sala de espera y NO se pide la sala: antes la pantalla llamaba al endpoint
 * apenas se montaba y el que llegaba temprano se comía un 409. La ventana se
 * calcula con el turno, que sale de `GET /appointments/me`; **el backend sigue
 * siendo la autoridad** y revalida lo mismo. Si el turno no aparece en esa lista
 * —está paginada— no se bloquea nada: se intenta entrar y decide el servidor.
 */

type VideoConsultationProps = {
  appointmentId: string;
};

type Fase = 'CURSO' | 'CIERRE';

export function VideoConsultation({ appointmentId }: VideoConsultationProps) {
  const { user } = useSession();
  const appointments = useMyAppointments();
  // Un tick por segundo: la sala de espera muestra una cuenta regresiva y tiene
  // que entrar sola al llegar la hora.
  const now = useNow(1000);

  const appointment =
    appointments.data?.find((cita) => cita.id === appointmentId) ?? null;
  const ventana = appointment ? joinStateOf(appointment, now) : null;

  // Mientras la lista no llegó no se pide nada: pedir a ciegas es justo lo que
  // hacía que llegar temprano generara un 409.
  const habilitado = !appointments.isPending && (ventana === null || ventana.kind === 'OPEN');

  const { estado, reintentar } = useVideoConsultationAccess(appointmentId, habilitado);

  const [fase, setFase] = useState<Fase>('CURSO');
  /** Cuándo se cerró la consulta. Fija el rango que muestra el resumen: si se
   *  recalculara en cada render, la hora de fin correría sola. */
  const [endedAt, setEndedAt] = useState<Date | null>(null);

  /**
   * Momento en que se abrió la pantalla: es el cero del cronómetro.
   *
   * Estado con inicializador perezoso y no un `useRef`: el cronómetro y el
   * encabezado del resumen lo LEEN al renderizar, y un ref leído en el render es
   * justamente lo que React desaconseja. El inicializador corre una sola vez, así
   * que el valor no se mueve entre renders.
   */
  const [joinedAt] = useState(() => new Date());

  const contraparte = appointment ? counterpartOf(appointment, user?.id ?? null) : null;
  const nombreContraparte = contraparte
    ? `${contraparte.firstName} ${contraparte.lastName}`
    : 'la otra persona';
  const esPaciente = appointment?.patient?.id === user?.id;

  if (appointment && ventana?.kind === 'TOO_EARLY') {
    return (
      <WaitingRoom
        appointment={appointment}
        opensAt={ventana.opensAt}
        now={now}
        counterpartName={nombreContraparte}
        counterpartLabel={esPaciente ? 'Profesional' : 'Paciente'}
      />
    );
  }

  if (appointment && ventana?.kind === 'CLOSED') {
    return (
      <Aviso titulo="Esta consulta ya terminó.">
        La sala se cerró. Si quedó algo pendiente, escribile a {nombreContraparte} o sacá un
        turno nuevo.
      </Aviso>
    );
  }

  if (appointment && ventana?.kind === 'NOT_APPLICABLE') {
    return (
      <Aviso titulo="Este turno no tiene videoconsulta.">
        El turno está {appointment.status === 'CANCELADO' ? 'cancelado' : 'sin vigencia'}, así
        que no hay sala que abrir.
      </Aviso>
    );
  }

  if (estado.fase === 'CARGANDO') {
    return (
      <p role="status" aria-live="polite" className="text-muted">
        Abriendo la sala…
      </p>
    );
  }

  if (estado.fase === 'ERROR') {
    return (
      <div className="rounded-[14px] border border-danger/30 bg-danger/5 p-6">
        <p role="alert" className="text-danger">
          {estado.error.message}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" onClick={reintentar}>
            Reintentar
          </Button>
          <Link
            to="/mis-turnos"
            className="inline-flex items-center text-sm font-semibold text-brand-hover underline-offset-2 hover:underline"
          >
            Volver a mis turnos
          </Link>
        </div>
      </div>
    );
  }

  const { access } = estado;
  const counterpartName = access.counterpart
    ? `${access.counterpart.firstName} ${access.counterpart.lastName}`
    : access.role === 'PACIENTE'
      ? 'tu profesional'
      : 'tu paciente';

  if (fase === 'CIERRE') {
    return (
      <ConsultationSummary
        counterpartName={counterpartName}
        joinedAt={joinedAt}
        endedAt={endedAt ?? new Date()}
        onBack={() => setFase('CURSO')}
      />
    );
  }

  return (
    <LiveConsultation
      access={access}
      counterpartName={counterpartName}
      joinedAt={joinedAt}
      onFinish={() => {
        setEndedAt(new Date());
        setFase('CIERRE');
      }}
    />
  );
}

/** Cartel de "acá no hay nada que hacer", con la salida a mano. */
function Aviso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="max-w-[620px] rounded-[14px] border border-line bg-white p-7">
      <h2 className="font-display text-[26px] leading-[1.2] text-brand-deep">{titulo}</h2>
      <p className="mt-2.5 text-sm leading-[1.7] text-muted">{children}</p>
      <Link
        to="/mis-turnos"
        className="mt-6 inline-flex items-center rounded-[9px] bg-brand-deep px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        Volver a mis turnos
      </Link>
    </div>
  );
}
