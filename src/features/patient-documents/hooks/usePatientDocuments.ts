import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiError, isClientError } from '../../../shared/api/apiError';
import {
  getDocumentDownload,
  getMyDocuments,
  getPatientDocuments,
  uploadDocument,
  withdrawDocument,
} from '../api/patientDocumentsApi';
import type { UploadDocumentInput } from '../types';

const MINE = ['patient-documents', 'me'] as const;
const UPLOAD = ['patient-documents', 'upload'] as const;

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
    mutationKey: UPLOAD,
    mutationFn: (input: UploadDocumentInput) => uploadDocument(input),
    // Sin reintento: cada subida deja un archivo y una fila que no se borran.
    retry: false,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MINE }),
  });
}

/**
 * Si hay una subida en vuelo. Lo usa quien abre el formulario para no cerrarlo
 * a mitad de camino: el request seguiría, y el paciente no se enteraría si falla
 * (y volvería a subirlo, duplicado contra el cupo).
 */
export function useIsUploadingDocument(): boolean {
  return useIsMutating({ mutationKey: UPLOAD }) > 0;
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
 *
 * - `opener = null` antes de navegar: la pestaña termina en otro origen (el
 *   storage) con un archivo que subió un usuario, y no tiene por qué poder
 *   redirigir esta (reverse tabnabbing). `noopener` no sirve acá porque hace que
 *   `window.open` devuelva `null` y no se podría navegar después.
 * - Solo `https:` (o un Supabase local): la URL viene de la respuesta y un
 *   `javascript:` sería XSS.
 * - Si el navegador bloqueó la pestaña, se avisa y no se navega esta: sacaría
 *   al paciente de la app con la URL firmada en el historial.
 */
export function useOpenDocument() {
  return useMutation({
    mutationFn: async (id: string) => {
      const pestaña = window.open('', '_blank');
      if (!pestaña) {
        throw new Error('Tu navegador bloqueó la pestaña. Permitila e intentá de nuevo.');
      }
      pestaña.opener = null;
      try {
        const { url } = await getDocumentDownload(id);
        if (!esUrlSegura(url)) throw apiError(502, 'No pudimos abrir el documento.');
        pestaña.location.href = url;
      } catch (error) {
        pestaña.close();
        throw error;
      }
    },
  });
}

/** `https:`, o `http:` contra un Supabase local (`supabase start`) en desarrollo. */
function esUrlSegura(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return (
      protocol === 'https:' ||
      (protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1'))
    );
  } catch {
    return false;
  }
}
