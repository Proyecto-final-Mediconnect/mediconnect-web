import { useEffect, useRef } from 'react';

type MonitorEcgProps = {
  /** Pulsaciones por minuto. `0` es la línea plana. */
  bpm: number;
  /** Se llama en cada pico R, para el pitido. */
  onLatido?: () => void;
  className?: string;
};

const PX_POR_SEGUNDO = 170;
const HUECO = 26;

/**
 * Un latido normalizado en [0, 1): onda P, complejo QRS y onda T.
 * Devuelve la altura en [-1, 1], positivo hacia arriba.
 */
function latido(fase: number): number {
  const entre = (a: number, b: number) => (fase - a) / (b - a);
  if (fase >= 0.1 && fase < 0.18) return 0.12 * Math.sin(Math.PI * entre(0.1, 0.18));
  if (fase >= 0.22 && fase < 0.24) return -0.12 * entre(0.22, 0.24);
  if (fase >= 0.24 && fase < 0.255) return -0.12 + 1.12 * entre(0.24, 0.255);
  if (fase >= 0.255 && fase < 0.275) return 1 - 1.3 * entre(0.255, 0.275);
  if (fase >= 0.275 && fase < 0.3) return -0.3 + 0.3 * entre(0.275, 0.3);
  if (fase >= 0.4 && fase < 0.56) return 0.24 * Math.sin(Math.PI * entre(0.4, 0.56));
  return 0;
}

/**
 * El trazo de un monitor de guardia: barre de izquierda a derecha y va pisando
 * lo viejo, como los de verdad. Cuando el paciente muere, `bpm` llega en 0 y la
 * línea sigue barriendo, plana y en rojo.
 */
export function MonitorEcg({ bpm, onLatido, className = '' }: MonitorEcgProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bpmRef = useRef(bpm);
  const onLatidoRef = useRef(onLatido);
  useEffect(() => {
    bpmRef.current = bpm;
    onLatidoRef.current = onLatido;
  }, [bpm, onLatido]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let ancho = 0;
    let alto = 0;
    let x = 0;
    let yPrev = 0;
    let fase = 0;
    let ultimo = performance.now();
    let raf = 0;

    const medir = () => {
      const dpr = window.devicePixelRatio || 1;
      ancho = canvas.clientWidth;
      alto = canvas.clientHeight;
      canvas.width = ancho * dpr;
      canvas.height = alto * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, ancho, alto);
      x = 0;
      yPrev = alto / 2;
    };

    const alturaEn = (f: number) => alto / 2 - latido(f) * alto * 0.4;

    const cuadro = (ahora: number) => {
      const dt = Math.min((ahora - ultimo) / 1000, 0.05);
      ultimo = ahora;
      const plano = bpmRef.current <= 0;
      ctx.strokeStyle = plano ? '#d64562' : '#2ec4b6';
      ctx.lineWidth = 2.4;
      ctx.lineJoin = 'round';
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 8;

      // Pasos chicos: a 170 px/s un cuadro avanza ~3 px y el pico R dura menos.
      const pasos = Math.max(1, Math.ceil(dt * PX_POR_SEGUNDO));
      for (let i = 0; i < pasos; i++) {
        const avance = dt / pasos;
        if (!plano) {
          const antes = fase;
          fase = (fase + avance * (bpmRef.current / 60)) % 1;
          if (antes < 0.255 && fase >= 0.255) onLatidoRef.current?.();
        }
        const y = plano ? alto / 2 : alturaEn(fase);
        const xNuevo = x + avance * PX_POR_SEGUNDO;

        ctx.clearRect(xNuevo, 0, HUECO, alto);
        ctx.beginPath();
        ctx.moveTo(x, yPrev);
        ctx.lineTo(xNuevo, y);
        ctx.stroke();

        x = xNuevo;
        yPrev = y;
        if (x > ancho) {
          x = 0;
          ctx.clearRect(0, 0, HUECO, alto);
        }
      }
      raf = requestAnimationFrame(cuadro);
    };

    // Sin animación: un trazo quieto que igual se lee como un monitor.
    const dibujarQuieto = () => {
      ctx.strokeStyle = bpmRef.current <= 0 ? '#d64562' : '#2ec4b6';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (let px = 0; px <= ancho; px++) {
        const f = ((px / PX_POR_SEGUNDO) * (Math.max(bpmRef.current, 0) / 60)) % 1;
        const y = bpmRef.current <= 0 ? alto / 2 : alturaEn(f);
        if (px === 0) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }
      ctx.stroke();
    };

    medir();
    const observador = new ResizeObserver(() => {
      medir();
      if (quieto) dibujarQuieto();
    });
    observador.observe(canvas);
    if (quieto) dibujarQuieto();
    else raf = requestAnimationFrame(cuadro);

    return () => {
      cancelAnimationFrame(raf);
      observador.disconnect();
    };
  }, []);

  return (
    <canvas ref={canvasRef} className={`block h-full w-full ${className}`} aria-hidden="true" />
  );
}
