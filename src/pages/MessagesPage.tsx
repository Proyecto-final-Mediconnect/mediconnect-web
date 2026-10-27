import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSession } from '../features/auth/hooks/useSession';
import { ConversationList } from '../features/chat/components/ConversationList';
import { ConversationView } from '../features/chat/components/ConversationView';
import { DraftConversationView } from '../features/chat/components/DraftConversationView';
import { NewChatDialog } from '../features/chat/components/NewChatDialog';
import { useConversations } from '../features/chat/hooks/useChat';
import { DashboardLayout } from './DashboardLayout';

/**
 * Mensajes (ENG-70): el chat paciente–profesional, para los dos roles.
 *
 * - `/mensajes`: la bandeja.
 * - `/mensajes/:conversationId`: una conversación.
 * - `/mensajes/nuevo/:contraparteId`: el borrador de un chat nuevo, que se crea
 *   recién con el primer mensaje.
 *
 * En pantallas anchas la bandeja y el chat van lado a lado; en el celular, uno
 * o el otro, para que el chat tenga el ancho entero.
 */
export function MessagesPage() {
  const { conversationId, contraparteId } = useParams<{
    conversationId?: string;
    contraparteId?: string;
  }>();
  const { user } = useSession();
  const inbox = useConversations();
  const [choosing, setChoosing] = useState(false);

  const role = user?.role === 'PROFESIONAL' ? 'PROFESIONAL' : 'PACIENTE';
  const selected = inbox.data?.conversaciones.find((c) => c.id === conversationId);
  const draftWith = inbox.data?.disponibles.find((p) => p.id === contraparteId);
  const showingChat = Boolean(conversationId || contraparteId);

  return (
    <DashboardLayout
      barTitle="Mensajes"
      subtitle={
        role === 'PROFESIONAL'
          ? 'Conversá con tus pacientes fuera de la consulta.'
          : 'Escribile a un profesional con el que ya tuviste un turno.'
      }
    >
      {inbox.isPending || !user ? (
        <p role="status" className="text-[14px] text-muted">
          Cargando tus mensajes…
        </p>
      ) : inbox.isError ? (
        <div role="alert" className="grid justify-items-start gap-3">
          <p className="text-[14px] text-danger">{inbox.error.message}</p>
          <button
            type="button"
            onClick={() => void inbox.refetch()}
            className="rounded-[9px] border border-line-strong bg-white px-4 py-2 text-[13px] font-bold text-brand-deep"
          >
            Probá de nuevo
          </button>
        </div>
      ) : (
        <>
          <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
            <div className={showingChat ? 'hidden lg:block' : ''}>
              <ConversationList
                inbox={inbox.data}
                selectedId={conversationId}
                myId={user.id}
                onNewChat={() => setChoosing(true)}
              />
            </div>

            {selected ? (
              <ConversationView
                key={selected.id}
                conversationId={selected.id}
                counterpart={selected.contraparte}
                myId={user.id}
              />
            ) : draftWith ? (
              <DraftConversationView key={draftWith.id} counterpart={draftWith} />
            ) : showingChat ? (
              <p className="rounded-[14px] border border-line bg-white px-5 py-4 text-[14px] text-muted">
                Esa conversación no existe o no es tuya.
              </p>
            ) : (
              <p className="hidden rounded-[14px] border border-line bg-white px-5 py-4 text-[14px] text-muted lg:block">
                Elegí una conversación para leerla, o empezá un chat nuevo.
              </p>
            )}
          </div>

          <NewChatDialog
            open={choosing}
            inbox={inbox.data}
            role={role}
            onClose={() => setChoosing(false)}
          />
        </>
      )}
    </DashboardLayout>
  );
}
