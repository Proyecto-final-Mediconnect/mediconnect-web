/**
 * Color de cada tipo de registro, con la misma forma que los estados de "Mis
 * turnos" (`StatusChip`): una píldora con un punto. El ámbar queda reservado
 * para "Corregida", que es una advertencia y no un tipo.
 */
export const TONO_TIPO: Record<string, { chip: string; dot: string }> = {
  CONSULTA: { chip: 'bg-surface-teal text-brand-hover', dot: 'bg-brand' },
  DIAGNOSTICO: { chip: 'bg-tag-consulta text-tag-consulta-ink', dot: 'bg-brand-deep' },
  PRESCRIPCION: { chip: 'bg-tag-correccion text-tag-correccion-ink', dot: 'bg-tag-correccion-ink' },
  ESTUDIO: { chip: 'bg-tag-estudio text-tag-estudio-ink', dot: 'bg-tag-estudio-ink' },
  CORRECCION: { chip: 'bg-line-soft text-muted', dot: 'bg-muted-soft' },
};
