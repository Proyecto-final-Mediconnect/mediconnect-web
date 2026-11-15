import { useEffect, useRef, useState } from 'react';
import { splitRoomUrl } from '../lib/splitRoomUrl';

/**
 * Embed de Daily Prebuilt con `@daily-co/daily-js`.
 *
 * El spike (ENG-51) lo resolvía con un `<iframe src>` plano, sin SDK. Eso no
 * deja esconder el botón **"Leave"** de la propia UI de Daily: es de dentro del
 * iframe y solo se apaga con la opción `showLeaveButton: false` de
 * `createFrame`. Salir de la llamada pasa a ser el botón "Terminar consulta" /
 * "Salir" de MediConnect, que además cierra el turno como corresponde.
 *
 * `createFrame` arma el mismo iframe de Prebuilt, con los permisos de cámara y
 * micrófono ya delegados (`allow`), así que el embed no cambia por lo demás.
 *
 * `daily-js` se importa recién al abrir una sala: es una dependencia pesada y
 * el resto de la web no la usa.
 */

type DailyPrebuiltFrameProps = {
  /** URL de la sala **con** el meeting token (`?t=...`): la sala es privada. */
  roomUrl: string;
  /** Se usa como `title` del iframe — es lo que anuncian los lectores de pantalla. */
  title: string;
};

export function DailyPrebuiltFrame({ roomUrl, title }: DailyPrebuiltFrameProps) {
  const container = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const parent = container.current;
    if (!parent) return;
    let cancelled = false;
    let destroy = () => {};

    void import('@daily-co/daily-js')
      .then(async ({ default: Daily }) => {
        if (cancelled) return;
        // Daily admite una sola instancia por página: si quedó una de un
        // montaje anterior (StrictMode, o volver a la sala), se descarta.
        await Daily.getCallInstance()?.destroy();
        if (cancelled) return;

        const frame = Daily.createFrame(parent, {
          showLeaveButton: false,
          showFullscreenButton: true,
          iframeStyle: { width: '100%', height: '100%', border: '0', borderRadius: '14px' },
        });
        destroy = () => void frame.destroy();
        // Lo que anuncian los lectores de pantalla: `createFrame` no tiene opción para el `title`.
        frame.iframe()?.setAttribute('title', title);

        const { url, token } = splitRoomUrl(roomUrl);
        await frame.join({ url, token });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      destroy();
    };
  }, [roomUrl, title]);

  if (failed) {
    return (
      <p role="alert" className="rounded-[14px] border border-line p-6 text-sm text-muted">
        No pudimos abrir la sala. Recargá la página e intentá de nuevo.
      </p>
    );
  }

  return (
    <div
      ref={container}
      className="h-[70vh] min-h-[420px] w-full overflow-hidden rounded-[14px] border border-line bg-black"
    />
  );
}
