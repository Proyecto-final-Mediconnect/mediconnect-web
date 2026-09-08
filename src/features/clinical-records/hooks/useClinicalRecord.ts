import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isClientError } from '../../../shared/api/apiError';
import { addClinicalEntry, getClinicalRecord } from '../api/clinicalRecordsApi';
import type { NewClinicalEntryPayload } from '../types/clinicalRecord';

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
    mutationFn: (payload: NewClinicalEntryPayload) =>
      addClinicalEntry(patientId, payload),
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
