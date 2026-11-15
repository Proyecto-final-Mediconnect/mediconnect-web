import { useEffect, useRef, useState } from 'react';
import type { DailyCall } from '@daily-co/daily-js';
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

/**
 * El `destroy` en curso de la instancia anterior. Si el componente se desmonta y
 * vuelve a montarse enseguida, el efecto nuevo lo espera antes de `createFrame`
 * (Daily admite una sola instancia por página) y no destruye dos veces lo mismo.
 */
let destroying: Promise<unknown> = Promise.resolve();

function destroyFrame(frame: DailyCall) {
  destroying = Promise.resolve()
    .then(() => frame.destroy())
    // Un `destroy` que falla no es un error de la sala nueva.
    .catch(() => {});
}

export function DailyPrebuiltFrame({ roomUrl, title }: DailyPrebuiltFrameProps) {
  const container = useRef<HTMLDivElement>(null);
  const frameRef = useRef<DailyCall | null>(null);
  const titleRef = useRef(title);
  const [failed, setFailed] = useState(false);

  // El `title` es cosmético: cambiarlo no recrea la llamada.
  useEffect(() => {
    titleRef.current = title;
    // Lo que anuncian los lectores de pantalla: `createFrame` no tiene opción para el `title`.
    frameRef.current?.iframe()?.setAttribute('title', title);
  }, [title]);

  useEffect(() => {
    const parent = container.current;
    if (!parent) return;
    let cancelled = false;
    let frame: DailyCall | null = null;
    setFailed(false);

    void import('@daily-co/daily-js')
      .then(async ({ default: Daily }) => {
        if (cancelled) return;
        // Antes de tocar nada: una URL mal formada falla acá y no con el frame armado.
        const { url, token } = splitRoomUrl(roomUrl);
        await destroying;
        if (cancelled) return;
        // Daily admite una sola instancia por página: si quedó una de un
        // montaje anterior (StrictMode, o volver a la sala), se descarta.
        try {
          await Daily.getCallInstance()?.destroy();
        } catch {
          // ya se estaba destruyendo
        }
        if (cancelled) return;

        frame = Daily.createFrame(parent, {
          showLeaveButton: false,
          showFullscreenButton: true,
          iframeStyle: { width: '100%', height: '100%', border: '0', borderRadius: '14px' },
        });
        frameRef.current = frame;
        frame.iframe()?.setAttribute('title', titleRef.current);

        await frame.join({ url, token });
      })
      .catch(() => {
        if (cancelled) return;
        if (frame) {
          destroyFrame(frame);
          frame = null;
          frameRef.current = null;
        }
        setFailed(true);
      });

    return () => {
      cancelled = true;
      if (frame) {
        destroyFrame(frame);
        if (frameRef.current === frame) frameRef.current = null;
      }
    };
  }, [roomUrl]);

  // El contenedor queda siempre montado: así, si llega otra `roomUrl` después de
  // un error, el efecto tiene dónde volver a armar la llamada.
  return (
    <>
      {failed && (
        <p role="alert" className="rounded-[14px] border border-line p-6 text-sm text-muted">
          No pudimos abrir la sala. Recargá la página e intentá de nuevo.
        </p>
      )}
      <div
        ref={container}
        hidden={failed}
        className="h-[70vh] min-h-[420px] w-full overflow-hidden rounded-[14px] border border-line bg-black"
      />
    </>
  );
}
