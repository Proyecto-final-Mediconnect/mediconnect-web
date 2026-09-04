import { Link, useParams } from 'react-router-dom';
import { useMyAppointments } from '../features/appointments/hooks/useAppointments';
import { SystolicChart } from '../features/clinical-record/components/SystolicChart';
import { newestFirst } from '../features/clinical-record/lib/clinicalRecord';
import {
  MOCK_ACCESS_GRANT,
  MOCK_CLINICAL_ENTRIES,
  MOCK_VITALS,
  OBJETIVO_SISTOLICA,
} from '../features/clinical-record/lib/mockClinicalRecord';
import { ENTRY_TYPE_LABELS } from '../features/clinical-record/types/clinicalRecord';
import { formatLongDate } from '../features/appointments/lib/myAppointments';
import { canJoin } from '../features/video/lib/joinWindow';
import { mockPatientBrief } from '../features/video/lib/mockConsultation';
import { DashboardLayout } from './DashboardLayout';

/**
 * Ficha de paciente (pantalla "ficha" del canvas). Es la HISTORIA CLÍNICA VISTA
 * POR EL PROFESIONAL: no repite `/historia`, que es la del propio paciente.
 *
 * ⚠️ **Nada de esta pantalla está conectado.** No hay endpoints de historia
 * clínica, de signos vitales, de alertas ni de accesos; la lista completa está en
 * `lib/mockClinicalRecord`. Cada bloque lo dice donde corresponde.
 *
 * **La alerta clínica del canvas no está.** El canvas dibuja una "alerta clínica ·
 * prioridad alta" generada del historial, con su prioridad y sus botones de
 * revisar y descartar. No existe en Linear: no hay ticket de alertas, de
 * detección de señales ni de riesgo, en ninguno de los 92 issues del proyecto. Lo
 * que sí está planificado de inteligencia clínica es la transcripción (ENG-77), el
 * resumen con Gemini (ENG-78) y su revisión (ENG-79) — todo sobre la consulta, no
 * sobre el historial. Una recomendación médica generada es lo último que conviene
 * inventar en una pantalla que un profesional podría llegar a creerle.
 *
 * La ficha se abre desde un turno y vuelve al panel. El canvas vuelve "a la
 * agenda", pero el único vínculo real entre un profesional y un paciente hoy es un
 * turno — y es también lo que ENG-60 valida por RLS para dar acceso.
 */
export function PatientFilePage() {
  const { patientId } = useParams<{ patientId: string }>();
  const appointments = useMyAppointments();

  // El turno es lo único real de la pantalla: de ahí salen el nombre del
  // paciente y el acceso a la videoconsulta.
  const turno = (appointments.data ?? []).find((cita) => cita.patient?.id === patientId);
  const paciente = turno?.patient;
  const nombre = paciente ? `${paciente.firstName} ${paciente.lastName}` : 'Paciente';
  const ficha = mockPatientBrief();
  const ultimos = newestFirst(MOCK_CLINICAL_ENTRIES).slice(0, 3);

  if (appointments.isPending) {
    return (
      <DashboardLayout barTitle="Ficha de paciente">
        <p role="status" aria-live="polite" className="text-sm text-muted">
          Cargando…
        </p>
      </DashboardLayout>
    );
  }

  if (!turno) {
    return (
      <DashboardLayout barTitle="Ficha de paciente">
        <div className="max-w-[620px] rounded-[14px] border border-line bg-white p-7">
          <h2 className="font-display text-[26px] leading-[1.2] text-brand-deep">
            No tenés acceso a esta ficha.
          </h2>
          <p className="mt-2.5 text-sm leading-[1.7] text-muted">
            Solo se puede abrir la ficha de un paciente con el que tengas un turno.
          </p>
          <Link
            to="/profesional"
            className="mt-6 inline-flex items-center rounded-[9px] bg-brand-deep px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-night focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Volver al panel
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout barTitle="Ficha de paciente">
      <div className="grid gap-5">
        <Link
          to="/profesional"
          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted hover:text-brand-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          ← Volver al panel
        </Link>

        <header className="flex flex-wrap items-start justify-between gap-4 rounded-[14px] border border-night bg-night p-7 text-white lg:p-8">
          <div className="min-w-0">
            <h2 className="font-display text-[30px] leading-[1.1] text-white lg:text-[38px]">
              {nombre} · {ficha.edad} años
            </h2>
            <p className="mt-2.5 text-sm text-on-night">
              Acceso otorgado por la paciente hasta el{' '}
              {formatLongDate(MOCK_ACCESS_GRANT.vence)} · alcance {MOCK_ACCESS_GRANT.alcance}
            </p>
          </div>

          {canJoin(turno) && (
            <Link
              to={`/turnos/${turno.id}/videoconsulta`}
              className="rounded-[9px] bg-brand px-5 py-3 text-sm font-bold text-ink-deep transition-colors hover:bg-brand-bright focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-bright focus-visible:ring-offset-2 focus-visible:ring-offset-night"
            >
              Iniciar videoconsulta
            </Link>
          )}
        </header>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section
            aria-labelledby="presion"
            className="overflow-hidden rounded-[14px] border border-line bg-white"
          >
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line-soft px-6 py-[18px]">
              <div>
                <h3 id="presion" className="text-[17px] font-bold text-brand-deep">
                  Presión sistólica
                </h3>
                <p className="mt-1 text-[13px] text-muted">
                  Últimos {MOCK_VITALS.length} controles · mmHg
                </p>
              </div>
              <p className="text-right">
                <span className="font-display block text-[30px] leading-none text-danger tabular-nums">
                  {MOCK_VITALS[MOCK_VITALS.length - 1].sistolica}/
                  {MOCK_VITALS[MOCK_VITALS.length - 1].diastolica}
                </span>
                <span className="mt-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                  Última medición
                </span>
              </p>
            </header>

            <div className="px-6 py-5">
              <SystolicChart readings={MOCK_VITALS} objetivo={OBJETIVO_SISTOLICA} />
            </div>

            <p className="border-t border-dashed border-line-strong bg-surface px-6 py-3 text-[11px] leading-[1.6] text-muted-soft">
              Mediciones de ejemplo: no hay endpoint de signos vitales.
            </p>
          </section>

          <section
            aria-labelledby="ultimos"
            className="overflow-hidden rounded-[14px] border border-line bg-white"
          >
            <header className="border-b border-line-soft px-5 py-[18px]">
              <h3
                id="ultimos"
                className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
              >
                Últimos registros
              </h3>
            </header>

            <ul className="divide-y divide-line-soft">
              {ultimos.map((entrada) => (
                <li key={entrada.id} className="px-5 py-3.5">
                  <p className="text-[13px] font-bold text-brand-deep">{entrada.motivo}</p>
                  <p className="mt-1 text-[12px] text-muted">
                    {ENTRY_TYPE_LABELS[entrada.tipo]} · {entrada.codigo}
                  </p>
                </li>
              ))}
            </ul>

            <p className="border-t border-dashed border-line-strong bg-surface px-5 py-3 text-[11px] leading-[1.6] text-muted-soft">
              Registros de ejemplo: la historia clínica no expone endpoints.
            </p>
          </section>
        </div>

        {/* ENG-60 audita cada lectura en `audit_logs` y no devuelve la historia
            si no puede registrarla. El aviso queda condicionado a que esa lectura
            pase por el endpoint: mientras la pantalla muestre datos de ejemplo,
            no se registró nada y decir lo contrario sería mentir. */}
        <p className="rounded-[14px] border border-dashed border-line-strong bg-surface px-5 py-4 text-[13px] leading-[1.7] text-muted">
          Cada apertura de esta ficha queda asentada en el historial de accesos de la
          paciente, con quién, de quién y cuándo (Ley 26.529).{' '}
          <strong className="font-bold text-brand-deep">
            Todavía no, porque estos datos no salen del endpoint.
          </strong>
        </p>
      </div>
    </DashboardLayout>
  );
}
