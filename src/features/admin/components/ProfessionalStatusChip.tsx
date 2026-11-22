import type { ProfessionalStatus } from '../api/adminApi';

/** Cómo se nombra cada estado de un profesional, y su color (ENG-241). */
const PROFESSIONAL_STATUS: Record<
  ProfessionalStatus,
  { label: string; tone: 'ok' | 'warn' | 'bad' | 'neutral' }
> = {
  VALIDADO: { label: 'Validado', tone: 'ok' },
  PENDIENTE_VALIDACION_MATRICULA: { label: 'Matrícula pendiente', tone: 'warn' },
  RECHAZADO: { label: 'Matrícula rechazada', tone: 'neutral' },
  SUSPENDIDO: { label: 'Suspendido', tone: 'bad' },
};

const TONES = {
  ok: { chip: 'bg-surface-teal text-brand-hover', dot: 'bg-brand' },
  warn: { chip: 'bg-tag-warm text-tag-warm-ink', dot: 'bg-tag-warm-dot' },
  neutral: { chip: 'bg-line-soft text-muted', dot: 'bg-muted-soft' },
  bad: { chip: 'bg-danger/10 text-danger', dot: 'bg-danger' },
} as const;

/** El estado de un profesional como chip, igual que el de los turnos. */
export function ProfessionalStatusChip({ status }: { status: ProfessionalStatus }) {
  const { label, tone } = PROFESSIONAL_STATUS[status] ?? {
    label: status,
    tone: 'neutral' as const,
  };
  return (
    <span
      className={`inline-flex flex-none items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${TONES[tone].chip}`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${TONES[tone].dot}`} />
      {label}
    </span>
  );
}
