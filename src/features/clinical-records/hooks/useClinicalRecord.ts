import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isClientError } from '../../../shared/api/apiError';
import {
  addClinicalEntry,
  correctClinicalEntry,
  getClinicalRecord,
} from '../api/clinicalRecordsApi';
import type { CorrectionPayload, NewClinicalEntryPayload } from '../types/clinicalRecord';

const recordKey = (patientId: string) => ['clinical-record', patientId] as const;

/** Mismo criterio que el resto: los 4xx no se reintentan, los 5xx una vez. */
const retryServerErrorsOnly = (failureCount: number, error: Error) =>
  !isClientError(error) && failureCount < 1;

export function useClinicalRecord(patientId: string) {
  return useQuery({
    queryKey: recordKey(patientId),
    queryFn: () => getClinicalRecord(patientId),
    retry: retryServerErrorsOnly,
  });
}

export function useAddClinicalEntry(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: NewClinicalEntryPayload) => addClinicalEntry(patientId, payload),
    // Sin reintento automático: cada request agrega una fila que NO se puede
    // borrar. Un reintento silencioso ante un timeout dejaría el asiento
    // duplicado en la historia clínica, para siempre.
    retry: false,
    onSuccess: () => {
      // El criterio de aceptación pide que la entrada aparezca en el acto.
      void queryClient.invalidateQueries({ queryKey: recordKey(patientId) });
    },
  });
}

/**
 * Corrige una entrada de la HC (ENG-100).
 *
 * Mismo criterio que el alta y por el mismo motivo: **sin reintento automático**.
 * Una corrección es una fila nueva que no se puede borrar, y un reintento
 * silencioso ante un timeout dejaría dos correcciones del mismo asiento — que es
 * exactamente lo que el backend rechaza con 409, así que el segundo intento
 * fallaría mostrando un error sobre una corrección que en realidad se guardó.
 */
export function useCorrectClinicalEntry(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entryId, payload }: { entryId: string; payload: CorrectionPayload }) =>
      correctClinicalEntry(patientId, entryId, payload),
    retry: false,
    onSuccess: () => {
      // Se recarga la cadena entera y no se inserta la corrección a mano: el
      // vínculo con la entrada corregida —y la etiqueta CORREGIDA en la
      // original— se calculan sobre la lista completa.
      void queryClient.invalidateQueries({ queryKey: recordKey(patientId) });
    },
  });
}
