import { apiFetch } from '../../../shared/api/apiFetch';
import { toApiError } from '../../../shared/api/apiError';
import type {
  AttachmentUrl,
  ChatMessage,
  ConversationInbox,
  ConversationSummary,
  MessagesPage,
  RealtimeToken,
} from '../types/chat';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

function conversationPath(id: string, rest = ''): string {
  return `/conversations/${encodeURIComponent(id)}${rest}`;
}

/** `GET /conversations/me`: mis conversaciones y con quién puedo abrir una. */
export async function getMyConversations(): Promise<ConversationInbox> {
  const response = await apiFetch('/conversations/me');
  if (!response.ok) throw await toApiError(response, 'No pudimos cargar tus mensajes.');
  return (await response.json()) as ConversationInbox;
}

/** `POST /conversations`: abre la conversación, o devuelve la que ya existe. */
export async function openConversation(contraparteId: string): Promise<ConversationSummary> {
  const response = await apiFetch('/conversations', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ contraparteId }),
  });
  if (!response.ok) throw await toApiError(response, 'No pudimos abrir la conversación.');
  return (await response.json()) as ConversationSummary;
}

/** `GET /conversations/:id/messages`: los últimos mensajes, o los anteriores a `antesDe`. */
export async function getMessages(id: string, antesDe?: string): Promise<MessagesPage> {
  const query = antesDe ? `?antesDe=${encodeURIComponent(antesDe)}` : '';
  const response = await apiFetch(conversationPath(id, `/messages${query}`));
  if (!response.ok) throw await toApiError(response, 'No pudimos cargar los mensajes.');
  return (await response.json()) as MessagesPage;
}

/** `POST /conversations/:id/messages`. */
export async function sendMessage(id: string, contenido: string): Promise<ChatMessage> {
  const response = await apiFetch(conversationPath(id, '/messages'), {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ contenido }),
  });
  if (!response.ok) throw await toApiError(response, 'No pudimos enviar el mensaje.');
  return (await response.json()) as ChatMessage;
}

/** `PATCH /conversations/:id/read`: marca leído lo que mandó la otra persona. */
export async function markConversationRead(id: string): Promise<void> {
  const response = await apiFetch(conversationPath(id, '/read'), { method: 'PATCH' });
  if (!response.ok) throw await toApiError(response, 'No pudimos marcar los mensajes como leídos.');
}

/** `GET /conversations/realtime-token`: el JWT de la sesión, para el socket de Realtime. */
export async function getRealtimeToken(): Promise<RealtimeToken> {
  const response = await apiFetch('/conversations/realtime-token');
  if (!response.ok) throw await toApiError(response, 'No pudimos conectar el chat en vivo.');
  return (await response.json()) as RealtimeToken;
}

/**
 * `DELETE /conversations/:id`: "Borrar chat". Lo oculta solo de mi bandeja; uno
 * sin mensajes se elimina.
 */
export async function hideConversation(id: string): Promise<void> {
  const response = await apiFetch(conversationPath(id), { method: 'DELETE' });
  if (!response.ok) throw await toApiError(response, 'No pudimos borrar el chat.');
}

/**
 * `POST /conversations/:id/attachments` (ENG-102): un PDF, JPG o PNG de hasta
 * 10 MB, con un texto opcional. Va como multipart: el `Content-Type` con el
 * boundary lo arma el navegador.
 */
export async function sendAttachment(
  id: string,
  file: File,
  contenido?: string,
): Promise<ChatMessage> {
  const body = new FormData();
  body.append('file', file);
  if (contenido) body.append('contenido', contenido);
  const response = await apiFetch(conversationPath(id, '/attachments'), { method: 'POST', body });
  if (!response.ok) throw await toApiError(response, 'No pudimos mandar el archivo.');
  return (await response.json()) as ChatMessage;
}

/** Una URL firmada de cinco minutos para abrir el archivo de un mensaje. */
export async function getAttachmentUrl(id: string, messageId: string): Promise<AttachmentUrl> {
  const response = await apiFetch(
    conversationPath(id, `/messages/${encodeURIComponent(messageId)}/attachment`),
  );
  if (!response.ok) throw await toApiError(response, 'No pudimos abrir el archivo.');
  return (await response.json()) as AttachmentUrl;
}
