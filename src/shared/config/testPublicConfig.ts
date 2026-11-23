import type { PublicConfig } from './publicConfig';

/**
 * Lo que responde `GET /config` hoy, para los tests (ENG-229). `src/test/setup.ts`
 * hace que `usePublicConfig` devuelva esto en todos los tests, así ninguno depende
 * de un request a `/config`.
 */
export const TEST_PUBLIC_CONFIG: PublicConfig = {
  currency: 'ARS',
  legalVersion: '2026-10-13',
  booking: { horizonDays: 60, paymentWindowMinutes: 15 },
  videoConsultation: { opensMinutesBefore: 10, graceMinutesAfter: 15 },
  appointments: { manualCloseHoursAfter: 24 },
  medipass: { codeMinutes: 5, sessionMinutes: 30 },
  cancellationPolicy: { maxHours: 720, maxFullRefundHours: 24, minPartialRefundPercent: 30 },
};
