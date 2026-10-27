import { useNavigate } from 'react-router-dom';
import { Modal } from '../../../shared/ui/Modal';
import type { ConversationInbox } from '../types/chat';

type Props = {
  open: boolean;
  inbox: ConversationInbox;
  /** Quién mira: el texto habla de profesionales o de pacientes según el rol. */
  role: 'PACIENTE' | 'PROFESIONAL';
  onClose: () => void;
};

/**
 * "Nuevo chat" (ENG-70): elegir con quién hablar entre las personas con las que
 * hubo turno.
 *
 * Elegir no crea nada: lleva al borrador, y el chat existe recién con el primer
 * mensaje. Si con esa persona ya hay una conversación, lleva a ella en vez de
 * abrir otra.
 */
export function NewChatDialog({ open, inbox, role, onClose }: Props) {
  const navigate = useNavigate();

  const options = [
    ...inbox.disponibles.map((person) => ({ person, to: `/mensajes/nuevo/${person.id}` })),
    ...inbox.conversaciones.map((c) => ({ person: c.contraparte, to: `/mensajes/${c.id}` })),
  ].sort((a, b) => a.person.nombre.localeCompare(b.person.nombre, 'es'));
  const existing = new Set(inbox.conversaciones.map((c) => c.contraparte.id));

  const quienes = role === 'PACIENTE' ? 'profesionales' : 'pacientes';

  return (
    <Modal
      open={open}
      titulo="Nuevo chat"
      descripcion={`Podés escribirles a los ${quienes} con los que tuviste un turno.`}
      onClose={onClose}
    >
      <div className="px-7 py-5">
        {options.length === 0 ? (
          <p className="text-[14px] text-muted">
            Todavía no tuviste turnos, así que no hay con quién chatear. El chat se habilita después
            de un turno pagado.
          </p>
        ) : (
          <ul aria-label="Elegí con quién hablar" className="grid gap-2">
            {options.map(({ person, to }) => (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(to);
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-[10px] border border-line-strong bg-white px-4 py-3 text-left transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <span className="text-[14px] font-semibold text-brand-deep">{person.nombre}</span>
                  {existing.has(person.id) && (
                    <span className="text-[12px] text-muted">Ya hay un chat</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
