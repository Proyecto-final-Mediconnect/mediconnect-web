import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog';
import { useNow } from '../../../shared/hooks/useNow';
import { useCompleteAppointment } from '../../appointments/hooks/useAppointments';
import { formatElapsed } from '../lib/elapsed';
import type { VideoConsultationAccess } from '../types/dailyRoom';
import { DailyPrebuiltFrame } from './DailyPrebuiltFrame';
import { PatientBrief } from './PatientBrief';

/**
 * Consulta en curso (ENG-56), con el diseño del canvas.
 *
 * **Los controles de la llamada son los de Daily**, dentro del iframe. El canvas
 * dibuja los suyos —micrófono, cámara, compartir pantalla, finalizar—, pero
 * tenerlos propios significa dejar Prebuilt y manejar la llamada con
 * `@daily-co/daily-js`: renderizar los tracks, los dispositivos y los eventos de
 * participantes. Es una decisión de arquitectura que el spike de ENG-51 dejó
 * escrita para más adelante, así que acá se construye todo lo que rodea a la
 * llamada y la llamada sigue siendo la que ya funciona. Dibujar botones propios
 * al lado de los de Daily sería peor: dos filas de controles, una de mentira.
 *
 * El panel lateral es **solo del profesional**. En el canvas se llama "Info de
 * la paciente" y existe para que el médico tenga las alergias a la vista
 * mientras habla; al paciente no le aporta nada y le comería la mitad del video,
 * así que en su vista la llamada ocupa todo el ancho.
 */

type LiveConsultationProps = {
  access: VideoConsultationAccess;
  counterpartName: string;
  /** El paciente del turno, para su ficha al costado (ENG-191). `null` si el
   *  turno no está en la lista: la columna lo dice en vez de inventar. */
  patientId: string | null;
  /** Momento en que se abrió la sala: el cronómetro cuenta desde acá. */
  joinedAt: Date;
  /** Hora de fin del turno. Antes de esa hora, "Finalizar" pide confirmación.
   *  `null` si el turno no está en la lista: se confirma siempre. */
  endsAt: Date | null;
  onFinish: () => void;
};

export function LiveConsultation({
  access,
  counterpartName,
  patientId,
  joinedAt,
  endsAt,
  onFinish,
}: LiveConsultationProps) {
  // Un tick por segundo: es un cronómetro a la vista, no un botón que aparece.
  const now = useNow(1000);
  const esProfesional = access.role === 'PROFESIONAL';
  // "Finalizar" cierra el turno en el backend (ENG-189) antes de pasar al
  // resumen: es lo que deja al paciente reseñar. Si falla, se queda en la
  // llamada con el error a la vista y se puede reintentar (es idempotente).
  const complete = useCompleteAppointment();
  const cerrarTurno = () =>
    complete.mutate(access.appointmentId, {
      onSuccess: () => {
        setConfirmando(false);
        onFinish();
      },
      // El error se muestra en la pantalla de la llamada, no detrás del modal.
      onError: () => setConfirmando(false),
    });
  // Cerrar el turno no tiene vuelta atrás: con el turno completado la sala ya
  // no deja entrar. Antes de la hora de fin se confirma, por si fue un click de
  // más (review de #75); después, la consulta ya terminó y se cierra directo.
  const [confirmando, setConfirmando] = useState(false);
  const finalizar = () => {
    if (endsAt === null || now < endsAt) setConfirmando(true);
    else cerrarTurno();
  };

  return (
    <div
      className={`grid items-start gap-4 ${
        esProfesional ? 'xl:grid-cols-[minmax(0,1fr)_340px]' : ''
      }`}
    >
      <div className="grid gap-3">
        <BarraDeEstado
          transcurrido={formatElapsed(now.getTime() - joinedAt.getTime())}
          grabando={access.recording.enabled}
        />

        <DailyPrebuiltFrame
          roomUrl={access.roomUrl}
          title={`Videoconsulta con ${counterpartName}`}
        />

        <RecordingNotice enabled={access.recording.enabled} />

        {/* El aviso vive acá y no en el subtítulo de la pantalla porque solo es
            cierto durante la llamada: en el resumen la consulta ya terminó. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            La sala se cierra automáticamente al terminar la consulta.
          </p>

          {/* Cerrar la consulta es del profesional: es quien después firma el
              resumen. El paciente sale de la sala y listo. */}
          {esProfesional ? (
            <button
              type="button"
              onClick={finalizar}
              disabled={complete.isPending}
              aria-busy={complete.isPending}
              className="inline-flex items-center gap-2 rounded-[9px] bg-brand-deep px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70"
            >
              {complete.isPending && (
                <span
                  aria-hidden="true"
                  className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
                />
              )}
              {complete.isPending ? 'Cerrando la consulta…' : 'Finalizar y ver el resumen'}
            </button>
          ) : (
            <Link
              to="/mis-turnos"
              className="rounded-[9px] border border-line-strong bg-white px-5 py-3 text-sm font-bold text-brand-deep transition-colors hover:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Salir de la consulta
            </Link>
          )}
        </div>

        {complete.isError && (
          <p role="alert" className="text-sm text-danger">
            {complete.error.message} Podés reintentar sin salir de la llamada.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={confirmando}
        titulo="¿Finalizar la consulta?"
        confirmar={complete.isPending ? 'Cerrando…' : 'Sí, finalizar'}
        cancelar="Seguir en la consulta"
        pendiente={complete.isPending}
        onCancel={() => setConfirmando(false)}
        onConfirm={cerrarTurno}
      >
        <p>
          Todavía no es la hora de fin del turno. Si finalizás, el turno queda completado y ya no se
          puede volver a entrar a la sala.
        </p>
      </ConfirmDialog>

      {esProfesional && (
        <aside className="grid gap-4">
          {patientId ? (
            <PatientBrief patientId={patientId} nombre={counterpartName} />
          ) : (
            <p className="rounded-[14px] border border-line bg-white px-5 py-4 text-[13px] text-muted">
              No pudimos identificar al paciente de este turno. Abrí su historia clínica desde
              &quot;Mis turnos&quot;.
            </p>
          )}
        </aside>
      )}
    </div>
  );
}

/** Cabecera oscura: cuánto hace que estás en la sala y bajo qué condiciones. */
function BarraDeEstado({ transcurrido, grabando }: { transcurrido: string; grabando: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-night px-5 py-3.5">
      <p className="flex items-center gap-2.5 text-[13px] font-semibold text-on-night-strong">
        <span aria-hidden="true" className="flex h-2 w-2">
          <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-brand-bright opacity-70 motion-reduce:animate-none" />
          <span className="inline-flex h-2 w-2 rounded-full bg-brand-bright" />
        </span>
        En consulta
        {/* `tabular-nums` para que los dígitos no bailen al cambiar el segundo. */}
        <span
          role="timer"
          aria-label={`Tiempo en consulta: ${transcurrido}`}
          className="font-bold tabular-nums text-white"
        >
          {transcurrido}
        </span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Chip tono={grabando ? 'aviso' : 'neutro'}>
          {grabando ? 'Grabando audio' : 'Sin grabar'}
        </Chip>
      </div>
    </div>
  );
}

function Chip({ tono, children }: { tono: 'ok' | 'aviso' | 'neutro'; children: React.ReactNode }) {
  const tonos = {
    ok: 'bg-brand/15 text-brand-bright',
    aviso: 'bg-amber-400/15 text-amber-200',
    neutro: 'bg-white/10 text-on-night',
  };

  return (
    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${tonos[tono]}`}>
      {children}
    </span>
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
      <p className="rounded-[10px] border border-line bg-surface px-4 py-2.5 text-xs text-muted">
        Esta consulta <span className="font-semibold">no se está grabando</span>.
      </p>
    );
  }

  return (
    <p
      role="status"
      className="rounded-[10px] border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-900"
    >
      <span className="font-semibold">Se está grabando el audio</span> de esta consulta para generar
      la transcripción y el resumen clínico. El resumen lo revisa el profesional antes de
      incorporarse a la historia clínica.
    </p>
  );
}
