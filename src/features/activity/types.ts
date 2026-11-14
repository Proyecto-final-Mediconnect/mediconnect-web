/** Una tasa con su base, para "8,0 % · 2 de 25". */
export interface StatsRate {
  /** Porcentaje con un decimal (8 → 8 %). */
  porcentaje: number;
  numerador: number;
  denominador: number;
}

/** Espeja `GET /professionals/me/stats` (ENG-196). */
export interface ProfessionalStats {
  from: string;
  to: string;
  turnos: {
    completados: number;
    noAsistio: number;
    cancelados: number;
    /** Reservas que no se pagaron a tiempo y se liberaron solas. */
    liberados: number;
    /** Confirmados que todavía no llegaron. */
    porVenir: number;
  };
  tasas: {
    /** Cancelados / (completados + no asistió + cancelados). `null` sin base. */
    cancelacion: StatsRate | null;
    /** No asistió / (completados + no asistió). `null` sin base. */
    ausentismo: StatsRate | null;
  };
  /** `YYYY-MM` en hora de Argentina, con los meses en 0. */
  consultasPorMes: { mes: string; consultas: number }[];
  pacientes: { unicos: number; recurrentes: number };
  resenas: { promedio: number | null; cantidad: number; sinResponder: number };
}
