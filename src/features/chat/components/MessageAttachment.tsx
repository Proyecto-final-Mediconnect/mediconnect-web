import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { getAttachmentUrl } from '../api/chatApi';
import { attachmentKind, formatSize, isImage } from '../lib/attachments';
import type { ChatAttachment } from '../types/chat';

type Props = {
  conversationId: string;
  messageId: string;
  attachment: ChatAttachment;
  /** Dentro de una burbuja propia (fondo oscuro) o ajena (blanca). */
  mine: boolean;
};

/**
 * La URL firmada dura cinco minutos: se reusa cuatro y después se pide otra.
 * Así una foto que se ve y se toca enseguida no hace dos pedidos, y una URL a
 * punto de vencer no se entrega.
 */
const URL_FRESH_MS = 4 * 60_000;

const attachmentKey = (conversationId: string, messageId: string) =>
  ['chat', 'attachment', conversationId, messageId] as const;

/**
 * El archivo de un mensaje (ENG-102).
 *
 * Una foto se ve en miniatura dentro de la burbuja; un PDF, como una tarjeta
 * con su tamaño. Tocar cualquiera de los dos lo abre entero en otra pestaña.
 *
 * El archivo nunca tiene una URL fija: el bucket es privado y cada URL la firma
 * el backend por cinco minutos con la sesión de quien la pide.
 */
export function MessageAttachment({ conversationId, messageId, attachment, mine }: Props) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const image = isImage(attachment);
  const query = {
    queryKey: attachmentKey(conversationId, messageId),
    queryFn: () => getAttachmentUrl(conversationId, messageId),
    staleTime: URL_FRESH_MS,
    gcTime: URL_FRESH_MS,
  };
  // Solo las fotos piden la URL al dibujarse, para la miniatura. Un PDF, al tocarlo.
  const preview = useQuery({ ...query, enabled: image, retry: false });

  async function open() {
    setError(null);
    // La pestaña se abre en el mismo clic, antes de esperar la URL: abierta
    // después de un `await`, el navegador la toma como popup y la bloquea.
    const tab = window.open('', '_blank');
    try {
      const { url } = await queryClient.fetchQuery(query);
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.location.assign(url);
      }
    } catch (err) {
      tab?.close();
      setError(err instanceof Error ? err.message : 'No pudimos abrir el archivo.');
    }
  }

  const label = `Abrir ${attachmentKind(attachment).toLowerCase()} (${formatSize(attachment.tamano)})`;

  return (
    <div className="grid gap-1">
      {image && preview.data ? (
        <button
          type="button"
          onClick={() => void open()}
          aria-label={label}
          className="block overflow-hidden rounded-[12px] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <img
            src={preview.data.url}
            alt=""
            className="max-h-[260px] w-auto max-w-full object-cover"
            onError={() => void preview.refetch()}
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void open()}
          aria-label={label}
          className={`flex min-w-[200px] items-center gap-3 rounded-[12px] px-3 py-2.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
            mine ? 'bg-white/10 hover:bg-white/15' : 'bg-surface hover:bg-surface-teal'
          }`}
        >
          <span
            aria-hidden="true"
            className={`flex size-10 flex-none items-center justify-center rounded-[10px] text-[11px] font-extrabold ${
              mine ? 'bg-white/15 text-white' : 'bg-white text-brand-deep'
            }`}
          >
            {image ? (preview.isPending ? '…' : 'IMG') : 'PDF'}
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-bold">{attachmentKind(attachment)}</span>
            <span className={`block text-[12px] ${mine ? 'text-white/75' : 'text-muted'}`}>
              {formatSize(attachment.tamano)} · Tocá para abrir
            </span>
          </span>
        </button>
      )}
      {error && (
        <p role="alert" className={`text-[12px] ${mine ? 'text-white' : 'text-danger'}`}>
          {error}
        </p>
      )}
    </div>
  );
}
