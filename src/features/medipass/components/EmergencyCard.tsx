import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Logo } from '../../../shared/ui/Logo';
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog';
import { MediPassQr } from '../../../shared/ui/MediPassQr';
import {
  useCreateEmergencyCard,
  useDisableEmergencyCard,
  useMyEmergencyCard,
} from '../hooks/useMediPass';
import { emergencyCardUrl } from '../lib/medipass';
import type { EmergencyCardCreated } from '../types/medipass';

const FECHA = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Argentina/Buenos_Aires',
});

/**
 * Tarjeta de emergencia del MediPass (ENG-176).
 *
 * El código rotativo solo se ve en la pantalla del paciente: si está
 * inconsciente o sin el celular, nadie puede abrir su ficha. La tarjeta es un QR
 * **fijo** que imprime o guarda, y que abre lo mismo que el código: 30 minutos
 * de información vital, con registro y aviso.
 *
 * ## El token se muestra una sola vez
 *
 * El backend guarda solo su hash, así que no hay forma de volver a pedirlo: el
 * QR se ve justo después de generarlo y nunca más. Vive en el estado de este
 * componente (no en la caché de react-query, ver `useCreateEmergencyCard`) y se
 * va al cerrarlo. Para reimprimir hay que generar una nueva, y eso invalida la
 * anterior: es exactamente lo que tiene que pasar si la tarjeta se perdió.
 */
export function EmergencyCard({ nombre }: { nombre: string }) {
  const estado = useMyEmergencyCard();
  const crear = useCreateEmergencyCard();
  const desactivar = useDisableEmergencyCard();
  const [recien, setRecien] = useState<EmergencyCardCreated | null>(null);
  const [confirmar, setConfirmar] = useState<'regenerar' | 'desactivar' | null>(null);

  function generar() {
    crear.mutate(undefined, {
      onSuccess: (tarjeta) => {
        setConfirmar(null);
        setRecien(tarjeta);
      },
      onError: () => setConfirmar(null),
    });
  }

  const error = crear.isError
    ? crear.error.message
    : desactivar.isError
      ? desactivar.error.message
      : null;

  return (
    <section
      aria-labelledby="tarjeta-emergencia"
      className="grid gap-5 rounded-[18px] border border-line bg-white p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="tarjeta-emergencia"
            className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-hover"
          >
            Tarjeta de emergencia
          </h2>
          <p className="mt-2 max-w-[60ch] text-[14px] leading-[1.6] text-muted">
            Para que te atiendan aunque no puedas mostrar el código: si estás inconsciente o sin el
            celular, un médico escanea la tarjeta y ve tu información vital durante 30 minutos.
            Queda registrado quién entró y te avisamos.
          </p>
        </div>
        {estado.data?.activa && !recien && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-teal px-3 py-1 text-xs font-bold text-brand-hover">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-brand" />
            Activa
          </span>
        )}
      </div>

      {recien ? (
        <TarjetaRecien tarjeta={recien} nombre={nombre} onListo={() => setRecien(null)} />
      ) : estado.isPending ? (
        <p role="status" className="text-[13px] text-muted">
          Cargando tu tarjeta…
        </p>
      ) : estado.isError ? (
        <div role="alert" className="grid justify-items-start gap-2">
          <p className="text-[13px] text-danger">{estado.error.message}</p>
          <button
            type="button"
            onClick={() => void estado.refetch()}
            className="text-[13px] font-semibold text-brand-deep underline underline-offset-2"
          >
            Reintentar
          </button>
        </div>
      ) : estado.data.activa ? (
        <div className="grid gap-4">
          <p className="text-[14px] leading-[1.6] text-ink">
            Tenés una tarjeta activa
            {estado.data.creadaEl && (
              <>
                {' '}
                desde el <strong>{FECHA.format(new Date(estado.data.creadaEl))}</strong>
              </>
            )}
            . Por seguridad no la podemos volver a mostrar: si la perdiste o la querés reimprimir,
            generá una nueva y la anterior deja de funcionar.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setConfirmar('regenerar')}
              className="rounded-full bg-brand-deep px-5 py-2.5 text-[14px] font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Generar una nueva
            </button>
            <button
              type="button"
              onClick={() => setConfirmar('desactivar')}
              className="rounded-full border border-line-strong px-5 py-2.5 text-[14px] font-semibold text-brand-deep transition-colors hover:border-danger hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Desactivar
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button
            type="button"
            onClick={generar}
            disabled={crear.isPending}
            className="rounded-full bg-brand-deep px-5 py-2.5 text-[14px] font-semibold text-white disabled:cursor-wait disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            {crear.isPending ? 'Generando…' : 'Generar mi tarjeta'}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-[13px] font-semibold text-danger">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirmar === 'regenerar'}
        titulo="¿Generar una tarjeta nueva?"
        confirmar="Generar una nueva"
        cancelar="Dejar la que tengo"
        pendiente={crear.isPending}
        onCancel={() => setConfirmar(null)}
        onConfirm={generar}
      >
        <p>
          La tarjeta que tenés deja de funcionar en este momento, y si alguien entró con ella, se le
          corta el acceso. Vas a tener que imprimir la nueva.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmar === 'desactivar'}
        titulo="¿Desactivar la tarjeta?"
        confirmar="Desactivar"
        cancelar="Dejarla activa"
        destructivo
        pendiente={desactivar.isPending}
        onCancel={() => setConfirmar(null)}
        onConfirm={() =>
          desactivar.mutate(undefined, {
            onSettled: () => setConfirmar(null),
          })
        }
      >
        <p>
          Nadie va a poder abrir tu MediPass con la tarjeta impresa, y si alguien entró con ella se
          le corta el acceso. El código de la app sigue funcionando.
        </p>
      </ConfirmDialog>
    </section>
  );
}

/**
 * La tarjeta para imprimir, justo después de generarla.
 *
 * Lo que sale en papel NO es esta vista sino `HojaTarjeta`: una hoja A4 propia,
 * montada fuera de la app (portal en `body`) y visible solo al imprimir. Antes se
 * intentaba imprimir esta misma tarjeta ocultando todo lo demás con CSS, y no
 * salía: vive dentro de un panel con scroll y de un diálogo, que el navegador
 * recorta al paginar.
 */
function TarjetaRecien({
  tarjeta,
  nombre,
  onListo,
}: {
  tarjeta: EmergencyCardCreated;
  nombre: string;
  onListo: () => void;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-[auto_minmax(0,1fr)] md:items-center">
      <HojaTarjeta tarjeta={tarjeta} nombre={nombre} />
      <div
        className="grid w-[340px] max-w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-4 justify-self-center rounded-[14px] border-2 border-danger bg-white p-4"
        aria-label="Tarjeta de emergencia para imprimir"
      >
        <MediPassQr value={emergencyCardUrl(window.location.origin, tarjeta.tarjeta)} size={128} />
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-danger">
            Emergencia médica
          </p>
          {nombre && (
            <p className="mt-1 text-[15px] font-bold leading-tight text-brand-deep">{nombre}</p>
          )}
          <p className="mt-2 text-[11px] leading-[1.45] text-ink">
            Escaneá este código con la cámara para ver mis alergias, medicación y contacto de
            emergencia.
          </p>
          <p className="mt-2 text-[10px] text-muted">MediConnect · MediPass</p>
        </div>
      </div>

      <div className="grid gap-3">
        <p
          role="status"
          className="rounded-[10px] border border-tag-warm-dot/40 bg-tag-warm px-4 py-3 text-[13px] leading-[1.6] text-ink"
        >
          <strong>Guardala ahora.</strong> Por seguridad no la vamos a volver a mostrar: imprimila o
          sacale una foto y llevala en la billetera.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-brand-deep px-5 py-2.5 text-[14px] font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Imprimir o guardar PDF
          </button>
          <button
            type="button"
            onClick={onListo}
            className="rounded-full border border-line-strong px-5 py-2.5 text-[14px] font-semibold text-brand-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Listo, ya la guardé
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * La hoja que se imprime (o se guarda como PDF desde el diálogo de impresión).
 *
 * Una hoja A4 con la tarjeta a tamaño real de tarjeta de crédito (85,6 × 54 mm)
 * dentro de un marco punteado para recortarla, y las instrucciones al costado.
 * Está en un portal en `body` y oculta en pantalla: el CSS de impresión
 * (`index.css`, `.hoja-tarjeta`) esconde el resto de la app y deja solo esto.
 */
function HojaTarjeta({ tarjeta, nombre }: { tarjeta: EmergencyCardCreated; nombre: string }) {
  return createPortal(
    <div className="hoja-tarjeta hidden bg-white text-ink print:block">
      <Logo variant="lockup" className="h-8" alt="MediConnect" />
      <h1 className="font-display mt-6 text-[26px] leading-[1.15] text-brand-deep">
        Tu tarjeta de emergencia MediPass
      </h1>
      <p className="mt-2 max-w-[150mm] text-[13px] leading-[1.6] text-muted">
        Recortala por la línea punteada y llevala en la billetera. Si alguien tiene que atenderte y
        no puede hablar, escanea el código y ve tus alergias, medicación y contacto de emergencia.
      </p>

      <div className="mt-8 inline-block border border-dashed border-muted-soft p-[3mm]">
        <div className="grid h-[54mm] w-[85.6mm] grid-cols-[auto_minmax(0,1fr)] items-center gap-[4mm] rounded-[3mm] border-2 border-danger bg-white p-[4mm]">
          <MediPassQr
            value={emergencyCardUrl(window.location.origin, tarjeta.tarjeta)}
            size={104}
          />
          <div className="min-w-0">
            <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-danger">
              Emergencia médica
            </p>
            {nombre && (
              <p className="mt-1 text-[12px] font-bold leading-tight text-brand-deep">{nombre}</p>
            )}
            <p className="mt-1.5 text-[8.5px] leading-[1.4] text-ink">
              Escaneá este código con la cámara para ver mis alergias, medicación y contacto de
              emergencia.
            </p>
            <p className="mt-1.5 text-[8px] text-muted">MediConnect · MediPass</p>
          </div>
        </div>
      </div>

      <ul className="mt-8 grid max-w-[150mm] gap-1.5 text-[12px] leading-[1.6] text-ink">
        <li>El código abre 30 minutos de información vital, y cada acceso queda registrado.</li>
        <li>Es personal: no lo compartas ni lo publiques.</li>
        <li>
          Si la perdés, desactivala desde MediPass &gt; Tarjeta de emergencia y generá una nueva.
        </li>
      </ul>
      <p className="mt-10 text-[10px] text-muted">
        Generada el {FECHA.format(new Date())} · MediConnect
      </p>
    </div>,
    document.body,
  );
}
