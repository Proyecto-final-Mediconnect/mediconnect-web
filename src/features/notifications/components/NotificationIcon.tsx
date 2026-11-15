import {
  IconAgenda,
  IconMediPass,
  IconMensajes,
  IconResenas,
  IconTurnos,
} from '../../../shared/ui/NavIcons';

type IconProps = { className?: string };

const BASE = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/** Pago: una tarjeta. */
function IconPago({ className = '' }: IconProps) {
  return (
    <svg {...BASE} className={`h-5 w-5 flex-none ${className}`}>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 15h3" />
    </svg>
  );
}

/** Turno cancelado: un círculo con la cruz. */
function IconCancelado({ className = '' }: IconProps) {
  return (
    <svg {...BASE} className={`h-5 w-5 flex-none ${className}`}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6M15 9l-6 6" />
    </svg>
  );
}

/** Cualquier otro aviso: la campanita. */
function IconAviso({ className = '' }: IconProps) {
  return (
    <svg {...BASE} className={`h-5 w-5 flex-none ${className}`}>
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

const ICONS: Record<string, (p: IconProps) => React.JSX.Element> = {
  MEDIPASS_ACCESO: IconMediPass,
  NUEVO_MENSAJE: IconMensajes,
  PAGO_ACREDITADO: IconPago,
  PAGO_CONFIRMADO: IconPago,
  TURNO_RESERVADO: IconTurnos,
  TURNO_REPROGRAMADO: IconTurnos,
  TURNO_CANCELADO: IconCancelado,
  RECORDATORIO_24H: IconAgenda,
  RECORDATORIO_1H: IconAgenda,
  RESENA_MODERADA: IconResenas,
};

/**
 * El ícono de cada tipo de aviso, para reconocerlo sin leerlo: los mismos que
 * usa la app (un calendario para los turnos, el globo para los mensajes…).
 */
export function NotificationIcon({ type, className }: { type: string; className?: string }) {
  const Icon = ICONS[type] ?? IconAviso;
  return <Icon className={className} />;
}
