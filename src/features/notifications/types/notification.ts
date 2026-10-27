/** Un aviso in-app, con el texto ya armado por el servidor (ENG-69). */
export interface InAppNotification {
  id: string;
  type: string;
  appointmentId: string | null;
  /** Conversación de un aviso de mensaje nuevo (ENG-70): tocarlo lleva al chat. */
  conversationId?: string | null;
  title: string;
  body: string;
  /** ISO-8601. */
  createdAt: string;
  /** ISO-8601, o `null` si todavía no se leyó. */
  readAt: string | null;
}

/** `GET /notifications/me`: los últimos avisos y cuántos están sin leer. */
export interface InAppInbox {
  unreadCount: number;
  notifications: InAppNotification[];
}
