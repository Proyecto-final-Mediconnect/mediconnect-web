import type { ChatAttachment } from '../types/chat';

/**
 * Archivos en el chat (ENG-102): lo que se acepta y cómo se nombra.
 *
 * El backend vuelve a validar todo, mirando el contenido y no solo el tipo
 * declarado. Esto existe para avisar antes de subir 10 MB que van a volver
 * rechazados.
 */

/** El mismo tope que el backend y el bucket. */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;

/** Para el `accept` del `<input type="file">`. */
export const ACCEPT_ATTRIBUTE = ACCEPTED_TYPES.join(',');

/** El motivo por el que no se puede mandar el archivo, o `null` si se puede. */
export function attachmentProblem(file: Pick<File, 'type' | 'size'>): string | null {
  if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    return 'Solo se pueden mandar PDF, JPG o PNG.';
  }
  if (file.size === 0) return 'El archivo está vacío.';
  if (file.size > MAX_ATTACHMENT_BYTES) return 'El archivo no puede pasar los 10 MB.';
  return null;
}

export function isImage(attachment: Pick<ChatAttachment, 'tipo'>): boolean {
  return attachment.tipo.startsWith('image/');
}

/** "340 KB", "1,2 MB". */
export function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString('es-AR', { maximumFractionDigits: 1 })} MB`;
}

/** "Foto" o "PDF": cómo se llama el archivo en la bandeja y para el lector de pantalla. */
export function attachmentKind(attachment: Pick<ChatAttachment, 'tipo'>): string {
  return isImage(attachment) ? 'Foto' : 'PDF';
}

/**
 * El texto de un mensaje en la bandeja: su contenido o, si es solo un archivo,
 * "📎 Foto" o "📎 PDF".
 */
export function messagePreview(message: {
  contenido: string;
  adjunto?: ChatAttachment | null;
}): string {
  if (message.contenido) return message.contenido;
  return message.adjunto ? `📎 ${attachmentKind(message.adjunto)}` : '';
}
