import { cuando } from '../../appointments/lib/timeline';
import type { IntegritySummary } from '../api/adminApi';

/** Cómo se lee cada resultado de la verificación (ENG-85, ENG-123). */
function lectura(check: IntegritySummary): { ok: boolean; titulo: string; detalle: string } {
  switch (check.status) {
    case 'OK':
      return {
        ok: true,
        titulo: 'La historia clínica está íntegra',
        detalle: 'Ningún registro se modificó ni se borró desde que se cargó.',
      };
    case 'INCONSISTENT':
      return {
        ok: false,
        titulo:
          check.inconsistencies === 1
            ? 'Se encontró una inconsistencia'
            : `Se encontraron ${check.inconsistencies} inconsistencias`,
        detalle:
          'Hay historias clínicas cuya cadena no cierra: algún registro se modificó por fuera de la aplicación. Hay que revisarlo.',
      };
    case 'ANCHOR_REGRESSION':
      return {
        ok: false,
        titulo: 'El ancla externa no coincide',
        detalle:
          'La huella publicada de las historias clínicas cambió sin que se agregaran registros. Hay que revisarlo.',
      };
    default:
      return {
        ok: false,
        titulo: 'La última verificación no pudo terminar',
        detalle: 'No sabemos si la historia clínica está íntegra: hay que volver a correrla.',
      };
  }
}

/**
 * La integridad de la historia clínica en el panel del administrador (ENG-195).
 *
 * Cada semana un job recorre la cadena de hash de cada paciente (ENG-85) y la
 * compara con el ancla publicada afuera (ENG-123). Es el diferencial del
 * proyecto y hasta ahora no se veía en ninguna pantalla: verde si todo cierra,
 * rojo si algo se tocó por fuera de la aplicación (Ley 26.529).
 */
export function IntegrityCard({ check }: { check: IntegritySummary | null }) {
  if (!check) {
    return (
      <section
        aria-label="Integridad de la historia clínica"
        className="rounded-[14px] border border-dashed border-line-strong bg-white p-5"
      >
        <p className="text-[15px] font-bold text-brand-deep">Integridad de la historia clínica</p>
        <p className="mt-1 text-sm text-muted">
          Todavía no corrió ninguna verificación. Corre sola todas las semanas.
        </p>
      </section>
    );
  }

  const { ok, titulo, detalle } = lectura(check);
  const verificado = [
    check.patientsChecked !== null &&
      `${check.patientsChecked} ${check.patientsChecked === 1 ? 'historia' : 'historias'}`,
    check.entriesChecked !== null &&
      `${check.entriesChecked} ${check.entriesChecked === 1 ? 'registro' : 'registros'}`,
  ].filter(Boolean);

  return (
    <section
      aria-label="Integridad de la historia clínica"
      className={`flex flex-wrap items-start gap-4 rounded-[14px] border p-5 ${
        ok ? 'border-brand/30 bg-surface-teal' : 'border-danger/40 bg-danger/5'
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex size-10 flex-none items-center justify-center rounded-full text-lg font-bold text-white ${
          ok ? 'bg-brand' : 'bg-danger'
        }`}
      >
        {ok ? '✓' : '!'}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-[16px] font-bold ${ok ? 'text-brand-deep' : 'text-danger'}`}>
          {titulo}
        </p>
        <p className="mt-1 text-sm text-ink">{detalle}</p>
        <p className="mt-2 text-xs text-muted">
          Última verificación: {cuando(check.at) ?? '—'}
          {verificado.length > 0 && ` · ${verificado.join(', ')} verificados`}
        </p>
      </div>
    </section>
  );
}
