import { useMemo, useState } from 'react';
import { ClinicalEntryItem } from '../features/clinical-record/components/ClinicalEntryItem';
import { ClinicalRecordFilters } from '../features/clinical-record/components/ClinicalRecordFilters';
import {
  applyClinicalFilters,
  correctionsByEntry,
  hasClinicalFilters,
  newestFirst,
  professionalsIn,
} from '../features/clinical-record/lib/clinicalRecord';
import {
  MOCK_CHAIN_STATUS,
  MOCK_CLINICAL_ENTRIES,
} from '../features/clinical-record/lib/mockClinicalRecord';
import {
  EMPTY_CLINICAL_FILTERS,
  type ClinicalRecordFilters as Filtros,
} from '../features/clinical-record/types/clinicalRecord';
import { DashboardLayout } from './DashboardLayout';

/**
 * Mi historia clínica (ENG-59).
 *
 * ⚠️ **Los registros son de ejemplo.** `ClinicalRecordsService` existe en el
 * backend con todo lo difícil resuelto —append-only, cadena de hash,
 * verificación de integridad— pero `ClinicalRecordsModule` no registra ningún
 * controller: no hay una sola ruta HTTP que devuelva esto. La pantalla lo dice
 * arriba de todo; los datos y la lista de endpoints que faltan viven en
 * `lib/mockClinicalRecord`.
 *
 * Las entradas van de la más nueva a la más vieja y **no se editan**: una
 * corrección entra como una entrada nueva que apunta a la original (ENG-100), y
 * las dos se muestran, vinculadas en los dos sentidos.
 */
export function ClinicalRecordPage() {
  const [filters, setFilters] = useState<Filtros>(EMPTY_CLINICAL_FILTERS);

  const entradas = MOCK_CLINICAL_ENTRIES;
  const correcciones = useMemo(() => correctionsByEntry(entradas), [entradas]);
  const porId = useMemo(() => new Map(entradas.map((e) => [e.id, e])), [entradas]);

  const visibles = useMemo(
    () => newestFirst(applyClinicalFilters(entradas, filters)),
    [entradas, filters],
  );

  const hayFiltros = hasClinicalFilters(filters);

  return (
    <DashboardLayout
      barTitle="Mi historia clínica"
      subtitle="Todo lo que registraron tus profesionales, en orden cronológico. Los registros cerrados no se editan: si hubo una corrección, aparece como una entrada nueva vinculada al original."
    >
      <div className="grid gap-5">
        <p className="rounded-[14px] border border-dashed border-line-strong bg-surface px-5 py-4 text-[13px] leading-[1.7] text-muted">
          <strong className="font-bold text-brand-deep">Registros de ejemplo.</strong> La
          historia clínica del backend está construida —entradas inmutables y encadenadas por
          hash— pero todavía no expone endpoints, así que estos registros no son de nadie.
        </p>

        <div className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="grid gap-4 lg:sticky lg:top-24">
            <ClinicalRecordFilters
              filters={filters}
              onChange={setFilters}
              profesionales={professionalsIn(entradas)}
              hayFiltros={hayFiltros}
              onLimpiar={() => setFilters(EMPTY_CLINICAL_FILTERS)}
            />

            <IntegridadDeLaCadena />

            {/* Descargar la propia historia clínica es un derecho del paciente
                (Ley 25.326), no un extra. Va deshabilitado y no escondido: que
                se vea que va a estar. */}
            <button
              type="button"
              disabled
              title="La descarga se habilita cuando la historia clínica tenga endpoint"
              className="rounded-[9px] border border-line-strong bg-white py-3 text-[13px] font-bold text-brand-deep disabled:cursor-not-allowed disabled:opacity-50"
            >
              Descargar historia en PDF
            </button>
          </div>

          <div className="grid gap-3.5">
            <p role="status" aria-live="polite" className="text-[13px] text-muted">
              {visibles.length === entradas.length
                ? `${entradas.length} registro${entradas.length === 1 ? '' : 's'} en tu historia.`
                : `${visibles.length} de ${entradas.length} registros.`}
            </p>

            {visibles.length === 0 ? (
              <p className="rounded-[14px] border border-line bg-white px-6 py-10 text-center text-sm text-muted">
                Ningún registro coincide con los filtros.
              </p>
            ) : (
              visibles.map((entrada) => (
                <ClinicalEntryItem
                  key={entrada.id}
                  entry={entrada}
                  corregidaPor={correcciones.get(entrada.id)}
                  corrige={
                    entrada.correctsEntryId
                      ? porId.get(entrada.correctsEntryId)
                      : undefined
                  }
                />
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

/**
 * Estado de la cadena de hash.
 *
 * No es decoración: es lo que le dice al paciente que nadie editó ni borró un
 * registro por atrás (ADR-015). El backend sabe calcularlo de verdad con
 * `verifyPatientChain`; falta el endpoint que lo exponga.
 */
function IntegridadDeLaCadena() {
  return (
    <section
      aria-labelledby="integridad"
      className="overflow-hidden rounded-[14px] border border-line bg-white"
    >
      <header className="border-b border-line-soft px-5 py-[18px]">
        <h2
          id="integridad"
          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted"
        >
          Integridad
        </h2>
      </header>

      <div className="px-5 py-4">
        <p className="flex items-center gap-2 text-[13px] font-bold text-brand-hover">
          <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-brand" />
          {MOCK_CHAIN_STATUS.integra ? 'Cadena íntegra' : 'Cadena alterada'}
        </p>
        <p className="mt-2 text-[12px] leading-[1.6] text-muted">
          Cada registro se sella con el hash del anterior. Si alguien editara o borrara uno, la
          cadena se rompería y quedaría a la vista.
        </p>
      </div>

      <p className="border-t border-dashed border-line-strong bg-surface px-5 py-3 text-[11px] leading-[1.6] text-muted-soft">
        Sin verificar de verdad: falta el endpoint que exponga la comprobación.
      </p>
    </section>
  );
}
