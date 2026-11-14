/** Espeja `GET /professionals/me/earnings` (ENG-194). */
export type EarningState = 'COBRADO' | 'REEMBOLSO_PARCIAL' | 'REEMBOLSADO' | 'REEMBOLSO_PENDIENTE';

export interface EarningRow {
  appointmentId: string;
  paidAt: string;
  date: string;
  startTime: string;
  patient: string;
  amount: number;
  refunded: number;
  refundPending: number;
  net: number;
  state: EarningState;
  refundPercent: number | null;
}

export interface EarningsView {
  from: string;
  to: string;
  currency: string;
  totals: { cobrado: number; reembolsado: number; neto: number; pendiente: number; turnos: number };
  rows: EarningRow[];
  pagina: number;
  hayMas: boolean;
}
