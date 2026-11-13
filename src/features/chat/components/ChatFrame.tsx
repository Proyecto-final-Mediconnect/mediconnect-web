import {
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react';
import { Link } from 'react-router-dom';
import type { Appointment } from '../../appointments/types/appointment';
import { ACCEPT_ATTRIBUTE, attachmentProblem, formatSize } from '../lib/attachments';
import { initialsOf } from '../lib/format';
import type { ChatCounterpart } from '../types/chat';

/** El mismo límite que valida el backend (`MESSAGE_MAX_LENGTH`). */
export const MESSAGE_MAX_LENGTH = 2000;

/** Hasta dónde crece el campo antes de scrollear: unas 5 líneas. */
const COMPOSER_MAX_HEIGHT = 132;

const ROLE: Record<ChatCounterpart['rol'], string> = {
  PACIENTE: 'Paciente',
  PROFESIONAL: 'Profesional',
};

const NEXT_DATE = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

/** "jue 6 nov, 10:30": lo justo para el chip del encabezado. */
function nextAppointmentLabel(appointment: Appointment): string {
  const date = NEXT_DATE.format(new Date(appointment.scheduledAt)).replace(/[.,]/g, '');
  return `${date}, ${appointment.startTime}`;
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'size-10 text-[13px]',
    md: 'size-11 text-[14px]',
    lg: 'size-[72px] text-[22px]',
  };
  return (
    <span
      aria-hidden="true"
      className={`flex flex-none items-center justify-center rounded-full bg-tag-consulta font-extrabold text-brand-deep ${sizes[size]}`}
    >
      {initialsOf(name)}
    </span>
  );
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 flex-none"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </svg>
  );
}

function Chevron({ className = 'size-4' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

type FrameProps = {
  counterpart: ChatCounterpart;
  /** Abre el panel con los datos de la otra persona. Sin esto, el nombre no se toca. */
  onOpenInfo?: () => void;
  /** El próximo turno con la otra persona, para el chip del encabezado. */
  nextAppointment?: Appointment | null;
  children: ReactNode;
  composer: ReactNode;
  busy?: boolean;
  /** La caja que scrollea los mensajes: la conversación mira si el usuario está al fondo. */
  bodyRef?: Ref<HTMLDivElement>;
};

/**
 * El marco de un chat (ENG-70): encabezado con la otra persona, los mensajes y
 * el campo para escribir. Lo comparten la
 * conversación abierta y el borrador de una nueva, así las dos se ven igual.
 *
 * El nombre del encabezado es el botón que abre el panel de información (sus
 * turnos, su perfil, borrar el chat). Lleva la flecha y "Ver turnos y perfil"
 * debajo porque, si no, nada dice que se puede tocar.
 */
export function ChatFrame({
  counterpart,
  onOpenInfo,
  nextAppointment,
  children,
  composer,
  busy,
  bodyRef,
}: FrameProps) {
  const who = (
    <>
      <Avatar name={counterpart.nombre} />
      <span className="flex min-w-0 flex-col gap-0.5 text-left">
        <span className="flex items-center gap-1 text-[16px] font-extrabold text-brand-deep">
          <span className="truncate">{counterpart.nombre}</span>
          {onOpenInfo && <Chevron className="size-4 flex-none" />}
        </span>
        <span className="text-[12px] font-semibold text-muted">
          {onOpenInfo ? 'Ver turnos y perfil' : ROLE[counterpart.rol]}
        </span>
      </span>
    </>
  );

  return (
    <section aria-labelledby="chat-contraparte" className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-line px-3 py-2.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-1">
          <Link
            to="/mensajes"
            aria-label="Volver a las conversaciones"
            className="flex size-11 flex-none items-center justify-center rounded-[10px] text-brand-deep hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:hidden"
          >
            <Chevron className="size-5 rotate-180" />
          </Link>
          <h2 id="chat-contraparte" className="min-w-0">
            {onOpenInfo ? (
              <button
                type="button"
                onClick={onOpenInfo}
                aria-label={`Ver información de ${counterpart.nombre}`}
                className="flex min-w-0 items-center gap-3 rounded-[12px] py-1.5 pl-1.5 pr-3 transition-colors hover:bg-surface-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:-ml-1.5"
              >
                {who}
              </button>
            ) : (
              <span className="flex min-w-0 items-center gap-3 py-1.5">{who}</span>
            )}
          </h2>
        </div>
        {nextAppointment && (
          <Link
            to={`/turnos/${nextAppointment.id}`}
            className="hidden flex-none items-center gap-2 rounded-[10px] bg-surface-teal px-3 py-2 text-[13px] font-bold text-brand-deep hover:bg-tag-consulta focus:outline-none focus-visible:ring-2 focus-visible:ring-brand md:flex"
          >
            <CalendarIcon />
            Próximo turno: {nextAppointmentLabel(nextAppointment)}
          </Link>
        )}
      </header>

      {nextAppointment && (
        <Link
          to={`/turnos/${nextAppointment.id}`}
          className="flex items-center gap-2 bg-surface-teal px-4 py-2.5 text-[13px] font-bold text-brand-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand md:hidden"
        >
          <CalendarIcon />
          <span className="flex-1">Próximo turno: {nextAppointmentLabel(nextAppointment)}</span>
          <Chevron />
        </Link>
      )}

      <div
        ref={bodyRef}
        className="relative flex-1 overflow-y-auto bg-surface px-3 py-4 sm:px-6 sm:py-5"
        aria-busy={busy}
      >
        {children}
      </div>

      {composer}
    </section>
  );
}

type ComposerProps = {
  counterpartName: string;
  pending: boolean;
  error: Error | null;
  /** Manda el mensaje; `onSent` se llama cuando quedó guardado, para limpiar el borrador. */
  onSend: (content: string, onSent: () => void) => void;
  /** Se llama mientras hay texto escrito, para el "está escribiendo…" de la otra persona. */
  onTyping?: () => void;
  /**
   * Manda un archivo con el texto escrito como comentario (ENG-102). Sin esto
   * no hay botón de adjuntar: el borrador de un chat nuevo arranca con texto.
   */
  onAttach?: (file: File, content: string, onSent: () => void) => void;
};

/**
 * El campo para escribir. Arranca en una línea y crece con el texto hasta unas
 * cinco; Enter envía y Shift + Enter hace un salto de línea.
 *
 * El borrador se limpia recién cuando el mensaje quedó guardado: si falla, lo
 * escrito sigue ahí para reintentar.
 */
export function MessageComposer({
  counterpartName,
  pending,
  error,
  onSend,
  onTyping,
  onAttach,
}: ComposerProps) {
  const [draft, setDraft] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileProblem, setFileProblem] = useState<string | null>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const content = draft.trim();
  const canSend =
    (content.length > 0 || file !== null) && content.length <= MESSAGE_MAX_LENGTH && !pending;
  const firstName = counterpartName.split(' ')[0];

  // Alto según el contenido: se resetea y se mide el `scrollHeight`, con tope.
  useLayoutEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${Math.min(field.scrollHeight, COMPOSER_MAX_HEIGHT)}px`;
  }, [draft]);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!canSend) return;
    setFileProblem(null);
    if (file && onAttach) {
      onAttach(file, content, () => {
        setDraft('');
        setFile(null);
      });
    } else {
      onSend(content, () => setDraft(''));
    }
  }

  function pick(picked: File | undefined) {
    // Se vacía el input: elegir el mismo archivo dos veces seguidas tiene que
    // volver a disparar el `change`.
    if (fileRef.current) fileRef.current.value = '';
    if (!picked) return;
    const problem = attachmentProblem(picked);
    setFileProblem(problem);
    setFile(problem ? null : picked);
    fieldRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-1.5 border-t border-line bg-white px-3 pb-3 pt-2.5 sm:px-5"
    >
      {(error ?? fileProblem) && (
        <p role="alert" className="text-[13px] text-danger">
          {error?.message ?? fileProblem}
        </p>
      )}
      {file && (
        <div className="flex items-center gap-2 self-start rounded-[10px] border border-line bg-surface py-1.5 pl-3 pr-1.5 text-[13px]">
          <span aria-hidden="true">📎</span>
          <span className="max-w-[220px] truncate font-semibold text-ink">{file.name}</span>
          <span className="text-muted">{formatSize(file.size)}</span>
          <button
            type="button"
            onClick={() => {
              setFile(null);
              setFileProblem(null);
            }}
            disabled={pending}
            aria-label={`Quitar ${file.name}`}
            className="flex size-7 items-center justify-center rounded-[8px] text-muted hover:bg-white hover:text-ink disabled:opacity-40"
          >
            ✕
          </button>
        </div>
      )}
      <div className="flex items-end gap-2 rounded-[14px] border border-line-strong py-1.5 pl-3.5 pr-1.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30">
        {onAttach && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              className="sr-only"
              tabIndex={-1}
              aria-label="Elegir un archivo"
              onChange={(e) => pick(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={pending}
              aria-label="Adjuntar una foto o un PDF"
              title="Adjuntar una foto o un PDF (hasta 10 MB)"
              className="-ml-1.5 flex size-10 flex-none items-center justify-center self-center rounded-[10px] text-muted transition-colors hover:bg-surface hover:text-brand-deep disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m21 11.5-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6l7.9-7.9" />
              </svg>
            </button>
          </>
        )}
        <label htmlFor="chat-borrador" className="sr-only">
          Mensaje para {counterpartName}
        </label>
        <textarea
          ref={fieldRef}
          id="chat-borrador"
          rows={1}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setFileProblem(null);
            if (e.target.value.trim()) onTyping?.();
          }}
          onKeyDown={onKeyDown}
          maxLength={MESSAGE_MAX_LENGTH}
          placeholder={file ? 'Agregá un comentario (opcional)…' : `Escribile a ${firstName}…`}
          className="max-h-[132px] min-h-[32px] flex-1 resize-none bg-transparent py-2 text-[14px] leading-[1.45] text-ink focus:outline-none"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Enviar mensaje"
          aria-busy={pending}
          className="flex size-11 flex-none items-center justify-center rounded-[12px] bg-brand text-ink-deep transition-opacity disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-deep"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-[18px]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </button>
      </div>
      <p className="hidden text-[11px] text-muted sm:block">
        Enter envía · Shift + Enter hace un salto de línea
      </p>
    </form>
  );
}
