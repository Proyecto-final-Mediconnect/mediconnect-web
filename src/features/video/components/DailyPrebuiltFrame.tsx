/**
 * Embed de Daily Prebuilt en un `<iframe>` (ENG-51).
 *
 * Prebuilt es una app web completa servida por Daily: no hace falta ningún SDK
 * para embeberla, alcanza con apuntar un iframe a la URL de la sala. Por eso el
 * spike no agrega `@daily-co/daily-js` — que sí haría falta si se quisiera una
 * UI propia o control programático de la llamada, y es una decisión que le
 * corresponde a ENG-56, no al spike.
 *
 * El atributo `allow` es lo único no obvio y lo único que puede romper el embed:
 * un iframe cross-origin NO hereda los permisos de cámara y micrófono de la
 * página que lo contiene. Sin `allow="camera; microphone"`, Prebuilt carga
 * perfecto y después falla al pedir los dispositivos, con un error que parece de
 * Daily y es de Permissions Policy.
 */

type DailyPrebuiltFrameProps = {
  /** URL de la sala **con** el meeting token (`?t=...`): la sala es privada. */
  roomUrl: string;
  /** Se usa como `title` del iframe — es lo que anuncian los lectores de pantalla. */
  title: string;
};

/**
 * Permisos delegados al iframe:
 * - `camera` / `microphone`: sin esto no hay videollamada.
 * - `autoplay`: para que el audio remoto arranque sin un click extra.
 * - `display-capture`: compartir pantalla.
 * - `fullscreen`: el botón de pantalla completa del Prebuilt.
 * - `clipboard-write`: el botón "copiar link" de la propia UI de Daily.
 */
const IFRAME_ALLOW = 'camera; microphone; autoplay; display-capture; fullscreen; clipboard-write';

export function DailyPrebuiltFrame({ roomUrl, title }: DailyPrebuiltFrameProps) {
  return (
    <iframe
      title={title}
      src={roomUrl}
      allow={IFRAME_ALLOW}
      className="h-[70vh] min-h-[420px] w-full rounded-xl border border-slate-200 bg-black"
    />
  );
}
