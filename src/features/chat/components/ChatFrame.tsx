import { useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { ChatCounterpart } from '../types/chat';

/** El mismo límite que valida el backend (`MESSAGE_MAX_LENGTH`). */
export const MESSAGE_MAX_LENGTH = 2000;

const ROLE: Record<ChatCounterpart['rol'], string> = {
  PACIENTE: 'Paciente',
  PROFESIONAL: 'Profesional',
};

type FrameProps = {
  counterpart: ChatCounterpart;
  /** Lo que va a la derecha del nombre: el estado de la conexión, el botón de borrar. */
  aside?: ReactNode;
  children: ReactNode;
  composer: ReactNode;
  busy?: boolean;
};

/**
 * El marco de un chat (ENG-70): encabezado con la otra persona, los mensajes y
 * el campo para escribir. Lo comparten la conversación abierta y el borrador de
 * una nueva, así las dos se ven igual.
 */
export function ChatFrame({ counterpart, aside, children, composer, busy }: FrameProps) {
  return (
    <section
      aria-labelledby="chat-contraparte"
      className="flex h-[min(640px,calc(100dvh-220px))] min-h-[420px] flex-col overflow-hidden rounded-[14px] border border-line bg-white"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="min-w-0">
          <Link
            to="/mensajes"
            className="mb-1 inline-block text-[12px] font-semibold text-brand-deep lg:hidden"
          >
            ← Conversaciones
          </Link>
          <h2 id="chat-contraparte" className="truncate text-[15px] font-bold text-brand-deep">
            {counterpart.nombre}
          </h2>
          <p className="text-[12px] text-muted">{ROLE[counterpart.rol]}</p>
        </div>
        {aside && <div className="flex flex-none items-center gap-3">{aside}</div>}
      </header>

      <div className="flex-1 overflow-y-auto bg-surface px-5 py-4" aria-busy={busy}>
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
};

/**
 * El campo para escribir. Enter envía y Shift + Enter hace un salto de línea.
 *
 * El borrador se limpia recién cuando el mensaje quedó guardado: si falla, lo
 * escrito sigue ahí para reintentar.
 */
export function MessageComposer({ counterpartName, pending, error, onSend }: ComposerProps) {
  const [draft, setDraft] = useState('');
  const content = draft.trim();
  const canSend = content.length > 0 && content.length <= MESSAGE_MAX_LENGTH && !pending;

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (canSend) onSend(content, () => setDraft(''));
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-2 border-t border-line px-4 py-3">
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error.message}
        </p>
      )}
      <div className="flex items-end gap-2">
        <label htmlFor="chat-borrador" className="sr-only">
          Mensaje para {counterpartName}
        </label>
        <textarea
          id="chat-borrador"
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          maxLength={MESSAGE_MAX_LENGTH}
          placeholder="Escribí un mensaje"
          className="min-h-[44px] flex-1 resize-none rounded-[10px] border border-line-strong px-3 py-2 text-[14px] text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
        />
        <button
          type="submit"
          disabled={!canSend}
          className="h-[44px] rounded-[10px] bg-brand px-5 text-[14px] font-bold text-ink-deep disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-deep"
        >
          {pending ? 'Enviando…' : 'Enviar'}
        </button>
      </div>
      <p className="text-[11px] text-muted">
        Enter para enviar, Shift + Enter para un salto de línea. Para una urgencia, llamá al 107.
      </p>
    </form>
  );
}
