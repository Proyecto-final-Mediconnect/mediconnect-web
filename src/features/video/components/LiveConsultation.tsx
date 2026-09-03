import { Link } from 'react-router-dom';
import { useNow } from '../../../shared/hooks/useNow';
import { formatElapsed } from '../lib/elapsed';
import { MOCK_TRANSCRIPT, mockPatientBrief } from '../lib/mockConsultation';
import type { VideoConsultationAccess } from '../types/dailyRoom';
import { DailyPrebuiltFrame } from './DailyPrebuiltFrame';

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
  /** Momento en que se abrió la sala: el cronómetro cuenta desde acá. */
  joinedAt: Date;
  onFinish: () => void;
};

export function LiveConsultation({
  access,
  counterpartName,
  joinedAt,
  onFinish,
}: LiveConsultationProps) {
  // Un tick por segundo: es un cronómetro a la vista, no un botón que aparece.
  const now = useNow(1000);
  const esProfesional = access.role === 'PROFESIONAL';

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
          mostrarConsentimiento={esProfesional}
          consentimientoFirmado={mockPatientBrief().consentimientoFirmado}
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
              onClick={onFinish}
              className="rounded-[9px] bg-brand-deep px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              Finalizar y ver el resumen
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
      </div>

      {esProfesional && (
        <aside className="grid gap-4">
          <InfoDeLaPaciente nombre={counterpartName} />
          <TranscripcionEnVivo />
        </aside>
      )}
    </div>
  );
}

/** Cabecera oscura: cuánto hace que estás en la sala y bajo qué condiciones. */
function BarraDeEstado({
  transcurrido,
  grabando,
  mostrarConsentimiento,
  consentimientoFirmado,
}: {
  transcurrido: string;
  grabando: boolean;
  mostrarConsentimiento: boolean;
  consentimientoFirmado: boolean;
}) {
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
        {mostrarConsentimiento && consentimientoFirmado && (
          <Chip tono="ok">✓ Consentimiento firmado</Chip>
        )}
      </div>
    </div>
  );
}

function Chip({
  tono,
  children,
}: {
  tono: 'ok' | 'aviso' | 'neutro';
  children: React.ReactNode;
}) {
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
      <span className="font-semibold">Se está grabando el audio</span> de esta consulta para
      generar la transcripción y el resumen clínico. El resumen lo revisa el profesional antes
      de incorporarse a la historia clínica.
    </p>
  );
}

/** Ficha de la contraparte, con las alergias primero: es el dato que cambia una
 *  indicación en el momento. */
function InfoDeLaPaciente({ nombre }: { nombre: string }) {
  const ficha = mockPatientBrief();

  return (
    <section
      aria-labelledby="info-paciente"
      className="overflow-hidden rounded-[14px] border border-line bg-white"
    >
      <header className="border-b border-line-soft px-5 py-[18px]">
        <h2
          id="info-paciente"
          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
        >
          Info de la paciente
        </h2>
        <p className="mt-1.5 text-[15px] font-bold text-brand-deep">
          {nombre} · {ficha.edad} años
        </p>
      </header>

      <dl className="divide-y divide-line-soft">
        <Dato titulo="Alergias" destacado>
          {ficha.alergias}
        </Dato>
        <Dato titulo="Medicación">{ficha.medicacion}</Dato>
        <Dato titulo="Condiciones">{ficha.condiciones}</Dato>
        <Dato titulo="Seguimiento">{ficha.seguimiento}</Dato>
      </dl>

      <DatosSimulados>
        Estos datos son de ejemplo. Salen de la historia clínica, que todavía no
        tiene endpoint.
      </DatosSimulados>
    </section>
  );
}

function Dato({
  titulo,
  destacado = false,
  children,
}: {
  titulo: string;
  destacado?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-3.5">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-soft">
        {titulo}
      </dt>
      <dd
        className={`mt-1 text-[13px] leading-[1.6] ${
          destacado ? 'font-bold text-danger' : 'font-semibold text-ink'
        }`}
      >
        {children}
      </dd>
    </div>
  );
}

/**
 * Transcripción en vivo.
 *
 * Muestra líneas fijas y no un stream: no hay transcripción de verdad. El botón
 * de pausar existe en el canvas y acá **no hace nada**, así que va deshabilitado
 * con su motivo en el `title` — un botón que responde al click sin efecto es
 * peor que uno que se ve apagado.
 */
function TranscripcionEnVivo() {
  return (
    <section
      aria-labelledby="transcripcion"
      className="overflow-hidden rounded-[14px] border border-line bg-white"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line-soft px-5 py-[18px]">
        <div>
          <h2
            id="transcripcion"
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
          >
            Transcripción en vivo
          </h2>
          <p className="mt-1.5 text-[11px] font-semibold text-muted-soft">Español (AR)</p>
        </div>

        <button
          type="button"
          disabled
          title="La transcripción todavía no está conectada"
          className="rounded-[7px] border border-line-strong px-3 py-1.5 text-[12px] font-bold text-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Pausar
        </button>
      </header>

      <div className="max-h-[280px] overflow-y-auto px-5 py-4">
        <ul className="grid gap-3">
          {MOCK_TRANSCRIPT.map((linea) => (
            <li key={linea.id}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-soft">
                {linea.quien === 'PROFESIONAL' ? 'Vos' : 'Paciente'}
              </p>
              <p className="mt-0.5 text-[13px] leading-[1.6] text-ink">{linea.texto}</p>
            </li>
          ))}
        </ul>
      </div>

      <DatosSimulados>
        Transcripción de ejemplo: no se está transcribiendo nada.
      </DatosSimulados>
    </section>
  );
}

/** Zócalo que marca un bloque como no conectado. Mismo tratamiento en los dos
 *  paneles para que se lea como una categoría y no como un aviso suelto. */
function DatosSimulados({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-t border-dashed border-line-strong bg-surface px-5 py-3 text-[11px] leading-[1.6] text-muted-soft">
      {children}
    </p>
  );
}
