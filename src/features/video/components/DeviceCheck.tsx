import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { Modal } from '../../../shared/ui/Modal';
import { createTestRoom } from '../api/videoApi';
import type { TestRoom } from '../types/dailyRoom';
import { DailyPrebuiltFrame } from './DailyPrebuiltFrame';

/**
 * Solo se abre en el iframe una URL https de un host daily.co: la URL viene del
 * backend y no se confía ciegamente en lo que llegue.
 */
function esUrlDeDaily(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && hostname.endsWith('.daily.co');
  } catch {
    return false;
  }
}

/**
 * "Probar cámara y micrófono": abre una sala de Daily para una sola persona, en
 * cualquier momento y sin turno.
 *
 * Es lo que en cualquier app de telemedicina evita que la consulta arranque con
 * cinco minutos de "¿me escuchás?": el navegador pide los permisos acá, con
 * tiempo, y no con el profesional del otro lado esperando. La pantalla previa de
 * Daily muestra la cámara, deja elegir micrófono y parlante y mide el volumen.
 *
 * La sala se pide recién al tocar el botón, porque cada una es una llamada a un
 * proveedor que factura: mientras la última no haya vencido se reusa, en vez de
 * crear una por clic. Al cerrar el diálogo el iframe se desmonta y se sale de la
 * llamada; Daily cierra la sala sola a los diez minutos.
 */
export function DeviceCheck({ variant = 'secondary' }: { variant?: 'primary' | 'secondary' }) {
  const [url, setUrl] = useState<string | null>(null);
  /** Última sala pedida, en memoria (su URL lleva token): se reusa hasta `expiraEl`. */
  const [sala, setSala] = useState<TestRoom | null>(null);
  const crear = useMutation({
    mutationFn: async () => {
      const nueva = await createTestRoom();
      if (!esUrlDeDaily(nueva.url)) {
        throw new Error('La sala de prueba no es válida. Intentá de nuevo.');
      }
      return nueva;
    },
    onSuccess: (nueva) => {
      setSala(nueva);
      setUrl(nueva.url);
    },
  });

  const probar = () => {
    if (sala && Date.now() < Date.parse(sala.expiraEl)) {
      setUrl(sala.url);
      return;
    }
    crear.mutate();
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        variant={variant}
        onClick={probar}
        disabled={crear.isPending}
        aria-busy={crear.isPending}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2.5" y="6" width="13" height="12" rx="2.5" />
          <path d="M15.5 10.5l6-3.5v10l-6-3.5" />
        </svg>
        {crear.isPending ? 'Preparando la prueba…' : 'Probar cámara y micrófono'}
      </Button>

      {crear.isError && (
        <p role="alert" className="text-[13px] font-semibold text-danger">
          {crear.error.message}
        </p>
      )}

      <Modal
        open={url !== null}
        titulo="Probar cámara y micrófono"
        descripcion="Esta sala es solo tuya: nadie más puede entrar. Si te ves y el medidor de volumen se mueve cuando hablás, está todo listo. Se cierra sola a los 10 minutos."
        tamano="ancho"
        onClose={() => {
          setUrl(null);
          crear.reset();
        }}
      >
        {url && <DailyPrebuiltFrame roomUrl={url} title="Prueba de cámara y micrófono" />}
      </Modal>
    </div>
  );
}
