/**
 * El estado de un turno como chip (ENG-178): un punto de color y el nombre en
 * minúscula, igual que en la app. El color dice qué hacer: verde está en orden,
 * naranja pide algo (pagar), gris ya terminó.
 */
const CHIPS: Record<string, { label: string; tone: 'ok' | 'warn' | 'neutral' | 'bad' }> = {
  CONFIRMADO: { label: 'Confirmado', tone: 'ok' },
  RESERVADO_SIN_PAGAR: { label: 'Sin pagar', tone: 'warn' },
  COMPLETADO: { label: 'Completado', tone: 'neutral' },
  CANCELADO: { label: 'Cancelado', tone: 'neutral' },
  LIBERADO: { label: 'Liberado', tone: 'neutral' },
  NO_ASISTIO: { label: 'No asistió', tone: 'bad' },
};

const TONES = {
  ok: { chip: 'bg-surface-teal text-brand-hover', dot: 'bg-brand' },
  warn: { chip: 'bg-tag-warm text-tag-warm-ink', dot: 'bg-tag-warm-dot' },
  neutral: { chip: 'bg-line-soft text-muted', dot: 'bg-muted-soft' },
  bad: { chip: 'bg-danger/10 text-danger', dot: 'bg-danger' },
} as const;

export function StatusChip({ status, onDark = false }: { status: string; onDark?: boolean }) {
  const chip = CHIPS[status] ?? { label: status, tone: 'neutral' as const };
  const tone = TONES[chip.tone];

  return (
    <span
      className={`inline-flex flex-none items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        onDark ? 'bg-white/10 text-on-night-strong' : tone.chip
      }`}
    >
      <span aria-hidden="true" className={`size-1.5 rounded-full ${tone.dot}`} />
      {chip.label}
    </span>
  );
}

/**
 * "Pagado" al lado de "Confirmado" en los turnos del paciente (ENG-199). Un turno
 * confirmado siempre se pagó —es lo que lo confirma (ENG-64)—, pero decirlo
 * explícito le saca la duda a quien acaba de pagar.
 */
export function PaidChip({ onDark = false }: { onDark?: boolean }) {
  return (
    <span
      className={`inline-flex flex-none items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        onDark ? 'bg-brand/20 text-brand-bright' : 'bg-brand/10 text-brand-hover'
      }`}
    >
      <span aria-hidden="true">✓</span>
      Pagado
    </span>
  );
}
