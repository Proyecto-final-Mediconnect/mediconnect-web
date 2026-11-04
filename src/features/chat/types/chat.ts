/** Tipos del chat paciente–profesional (ENG-70). Espejan las respuestas de `/conversations`. */

export type ChatRole = 'PACIENTE' | 'PROFESIONAL';

/** La otra persona de una conversación. */
export interface ChatCounterpart {
  id: string;
  nombre: string;
  rol: ChatRole;
}

/** El archivo de un mensaje (ENG-102). El archivo se abre con una URL firmada que se pide aparte. */
export interface ChatAttachment {
  /** `application/pdf`, `image/jpeg` o `image/png`. */
  tipo: string;
  /** En bytes. */
  tamano: number;
}

export interface ChatMessage {
  id: string;
  conversacionId: string;
  autorId: string;
  /** Vacío si el mensaje es solo un archivo. */
  contenido: string;
  /** ISO-8601. */
  enviadoEl: string;
  /** ISO-8601, o `null` si la otra persona todavía no lo leyó. */
  leidoEl: string | null;
  /** Opcional: un backend anterior a ENG-102 no lo manda. */
  adjunto?: ChatAttachment | null;
}

/** `GET /conversations/:id/messages/:messageId/attachment`. */
export interface AttachmentUrl {
  url: string;
  expiraEl: string;
}

export interface ConversationSummary {
  id: string;
  contraparte: ChatCounterpart;
  ultimoMensaje: ChatMessage | null;
  noLeidos: number;
  creadaEl: string;
}

/** `GET /conversations/me`. */
export interface ConversationInbox {
  conversaciones: ConversationSummary[];
  /** Con quién se puede abrir una conversación nueva: hubo turno y todavía no hay chat. */
  disponibles: ChatCounterpart[];
}

/** `GET /conversations/:id/messages`: una página, en orden cronológico. */
export interface MessagesPage {
  mensajes: ChatMessage[];
  hayMas: boolean;
}

/** `GET /conversations/realtime-token`. */
export interface RealtimeToken {
  accessToken: string;
  expiraEl: string;
}
