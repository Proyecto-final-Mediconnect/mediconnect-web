import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../shared/ui/Button';
import { useJoinVideoConsultation } from '../hooks/useVideoConsultation';
import { DailyPrebuiltFrame } from './DailyPrebuiltFrame';

/**
 * Videoconsulta de un turno (ENG-56).
 *
 * Pide la sala al backend al montarse y embebe el Prebuilt. Todo lo que decide
 * si se puede entrar —el rol, el estado del turno, la ventana horaria— lo
 * resuelve el servidor: acá solo se muestra el resultado. Por eso los errores se
 * muestran tal cual vienen, incluidos los de negocio ("la sala se abre 10
 * minutos antes"), que son la explicación correcta para el usuario.
 */

type VideoConsultationProps = {
  appointmentId: string;
};

export function VideoConsultation({ appointmentId }: VideoConsultationProps) {
  const join = useJoinVideoConsultation();
  const { mutate } = join;

  /**
   * `useRef` y no una dependencia del efecto: en StrictMode el efecto corre dos
   * veces en desarrollo, y cada llamada puede crear una sala en Daily. El guard
   * asegura una sola petición por montaje.
   */
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    mutate(appointmentId);
  }, [appointmentId, mutate]);

  if (join.isPending || join.isIdle) {
    return (
      <p role="status" aria-live="polite" className="text-muted">
        Abriendo la sala…
      </p>
    );
  }

  if (join.isError) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-6">
        <p role="alert" className="text-danger">
          {join.error.message}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" onClick={() => mutate(appointmentId)}>
            Reintentar
          </Button>
          <Link
            to="/mis-turnos"
            className="inline-flex items-center text-sm font-semibold text-brand hover:underline"
          >
            Volver a mis turnos
          </Link>
        </div>
      </div>
    );
  }

  const access = join.data;
  const counterpartName = access.counterpart
    ? `${access.counterpart.firstName} ${access.counterpart.lastName}`
    : access.role === 'PACIENTE'
      ? 'tu profesional'
      : 'tu paciente';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Consulta con <span className="font-semibold text-ink">{counterpartName}</span>
        </p>
        <Link
          to="/mis-turnos"
          className="text-sm font-semibold text-brand hover:underline"
          // La consulta sigue en la sala hasta que se cierre la pestaña o expire:
          // este link es "salir de la pantalla", no "cortar la llamada".
        >
          Salir
        </Link>
      </div>

      <RecordingNotice enabled={access.recording.enabled} />

      <DailyPrebuiltFrame
        roomUrl={access.roomUrl}
        title={`Videoconsulta con ${counterpartName}`}
      />

      <p className="text-xs text-muted">
        La sala se cierra automáticamente al terminar la consulta.
      </p>
    </div>
  );
}

/**
 * Aviso de grabación.
 *
 * Se muestra **siempre**, diga lo que diga: que una consulta médica no se esté
 * grabando también es información que el paciente tiene derecho a tener antes de
 * hablar. Un aviso que solo aparece cuando se graba entrena a no leerlo.
 */
function RecordingNotice({ enabled }: { enabled: boolean }) {
  if (!enabled) {
    return (
      <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-muted">
        Esta consulta <span className="font-semibold">no se está grabando</span>.
      </p>
    );
  }

  return (
    <p
      role="status"
      className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-900"
    >
      <span className="font-semibold">Se está grabando el audio</span> de esta consulta para
      generar la transcripción y el resumen clínico. El resumen lo revisa el profesional antes
      de incorporarse a la historia clínica.
    </p>
  );
}
