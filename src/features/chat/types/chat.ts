/** Tipos del chat paciente–profesional (ENG-70). Espejan las respuestas de `/conversations`. */

export type ChatRole = 'PACIENTE' | 'PROFESIONAL';

/** La otra persona de una conversación. */
export interface ChatCounterpart {
  id: string;
  nombre: string;
  rol: ChatRole;
}

export interface ChatMessage {
  id: string;
  conversacionId: string;
  autorId: string;
  contenido: string;
  /** ISO-8601. */
  enviadoEl: string;
  /** ISO-8601, o `null` si la otra persona todavía no lo leyó. */
  leidoEl: string | null;
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
