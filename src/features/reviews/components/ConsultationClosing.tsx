import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMyReviews } from '../hooks/useReviews';
import { ReviewForm } from './ReviewForm';

const BOTON_MIS_TURNOS =
  'inline-flex items-center justify-center rounded-[10px] bg-brand-deep px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';

/**
 * Pantalla de cierre del paciente al salir de la sala (ENG-190): pide la reseña
 * ahí mismo, mientras la consulta está fresca.
 *
 * Es una pantalla y no un modal: después de una consulta médica un popup
 * molesta y se cierra sin leer. "Ahora no" lleva a "Mis turnos" sin guardar
 * nada; el pedido sigue en la tarjeta del inicio.
 */
export function ConsultationClosing({
  appointmentId,
  professionalName,
}: {
  appointmentId: string;
  professionalName: string;
}) {
  const navigate = useNavigate();
  const mias = useMyReviews();
  const [enviada, setEnviada] = useState(false);
  const yaReseno = mias.data?.some((r) => r.appointmentId === appointmentId) ?? false;

  return (
    <section
      aria-labelledby="cierre-consulta"
      className="mx-auto grid w-full max-w-[560px] gap-5 rounded-[16px] border border-line bg-white p-7"
    >
      <div className="grid gap-1.5">
        <h2
          id="cierre-consulta"
          className="font-display text-[26px] leading-[1.2] text-brand-deep [text-wrap:balance]"
        >
          Tu consulta con {professionalName} terminó
        </h2>
        {!enviada && !yaReseno && (
          <p className="text-sm leading-[1.7] text-muted">
            ¿Cómo te fue? Tu opinión ayuda a otros pacientes a elegir.
          </p>
        )}
      </div>

      {mias.isPending ? null : enviada || yaReseno ? (
        <div className="grid justify-items-start gap-4">
          <p role="status" className="text-sm leading-[1.7] text-ink">
            {enviada
              ? '¡Gracias! Tu reseña se publica cuando la revisemos.'
              : 'Ya dejaste tu reseña de esta consulta. ¡Gracias!'}
          </p>
          <Link to="/mis-turnos" className={BOTON_MIS_TURNOS}>
            Ir a mis turnos
          </Link>
        </div>
      ) : (
        <ReviewForm
          appointmentId={appointmentId}
          professionalName={professionalName}
          cancelLabel="Ahora no"
          onDone={() => setEnviada(true)}
          onCancel={() => void navigate('/mis-turnos')}
        />
      )}
    </section>
  );
}
