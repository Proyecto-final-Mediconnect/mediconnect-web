import { useNavigate } from 'react-router-dom';
import { useStartConversation } from '../hooks/useChat';
import type { ChatCounterpart } from '../types/chat';
import { ChatFrame, MessageComposer } from './ChatFrame';

type Props = { counterpart: ChatCounterpart };

/**
 * Un chat que todavía no existe (ENG-70): se ve igual que una conversación,
 * pero recién se crea al mandar el primer mensaje. Si la persona se arrepiente y
 * se va, no queda nada en ninguna bandeja.
 */
export function DraftConversationView({ counterpart }: Props) {
  const navigate = useNavigate();
  const start = useStartConversation();

  return (
    <ChatFrame
      counterpart={counterpart}
      composer={
        <MessageComposer
          counterpartName={counterpart.nombre}
          pending={start.isPending}
          error={start.error}
          onSend={(contenido, onSent) =>
            start.mutate(
              { contraparteId: counterpart.id, contenido },
              {
                onSuccess: (conversation) => {
                  onSent();
                  navigate(`/mensajes/${conversation.id}`, { replace: true });
                },
              },
            )
          }
        />
      }
    >
      <p className="text-[14px] text-muted">
        Escribile a {counterpart.nombre}. El chat se crea cuando mandes el primer mensaje.
      </p>
    </ChatFrame>
  );
}
