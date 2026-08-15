import { SpikeRoomPanel } from '../features/video/components/SpikeRoomPanel';

/**
 * Página de prueba del spike de Daily.co (ENG-51).
 *
 * Vive bajo `/spike/` y no bajo una ruta de producto porque **no es producto**:
 * es el banco de pruebas del spike. La videoconsulta real (ENG-56) arranca desde
 * un turno confirmado, valida que quien entra sea el paciente o el profesional
 * de ese turno, y no deja crear salas a mano.
 */
export function SpikeDailyPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <p className="text-sm font-medium text-brand">ENG-51 · Spike</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Daily.co Prebuilt en web</h1>
        <p className="mt-2 text-muted">
          Valida que el backend pueda crear una sala por la API REST de Daily y que el Prebuilt
          funcione embebido en un iframe de la web, con cámara, micrófono y pantalla compartida.
        </p>
      </header>
      <SpikeRoomPanel />
    </main>
  );
}
