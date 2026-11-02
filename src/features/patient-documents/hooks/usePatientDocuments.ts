import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isClientError } from '../../../shared/api/apiError';
import {
  getDocumentDownload,
  getMyDocuments,
  getPatientDocuments,
  uploadDocument,
  withdrawDocument,
} from '../api/patientDocumentsApi';
import type { UploadDocumentInput } from '../types';

const MINE = ['patient-documents', 'me'] as const;

const retryServerErrorsOnly = (failureCount: number, error: Error) =>
  !isClientError(error) && failureCount < 1;

export function useMyDocuments() {
  return useQuery({ queryKey: MINE, queryFn: getMyDocuments, retry: retryServerErrorsOnly });
}

export function usePatientDocuments(patientId: string) {
  return useQuery({
    queryKey: ['patient-documents', patientId],
    queryFn: () => getPatientDocuments(patientId),
    retry: retryServerErrorsOnly,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UploadDocumentInput) => uploadDocument(input),
    // Sin reintento: cada subida deja un archivo y una fila que no se borran.
    retry: false,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MINE }),
  });
}

export function useWithdrawDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: withdrawDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MINE }),
  });
}

/**
 * Abre un documento en otra pestaña. La pestaña se abre en el click, antes de
 * pedir la URL firmada: si se abriera después del `await`, el navegador la
 * tomaría como un popup no pedido y la bloquearía.
 */
export function useOpenDocument() {
  return useMutation({
    mutationFn: async (id: string) => {
      const pestaña = window.open('', '_blank');
      try {
        const { url } = await getDocumentDownload(id);
        if (pestaña) pestaña.location.href = url;
        else window.location.assign(url);
      } catch (error) {
        pestaña?.close();
        throw error;
      }
    },
  });
}
