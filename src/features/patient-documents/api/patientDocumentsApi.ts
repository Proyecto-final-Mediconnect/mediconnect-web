import { apiFetch } from '../../../shared/api/apiFetch';
import { apiError, toApiError } from '../../../shared/api/apiError';
import type { DocumentDownload, PatientDocument, UploadDocumentInput } from '../types';

/** Documentos propios, vigentes, del más nuevo al más viejo. */
export async function getMyDocuments(): Promise<PatientDocument[]> {
  const response = await apiFetch('/patients/me/documents');
  if (!response.ok) throw await toApiError(response, 'No pudimos cargar tus documentos.');
  return (await response.json()) as PatientDocument[];
}

/** Los de un paciente, para el profesional que puede leer su historia. */
export async function getPatientDocuments(patientId: string): Promise<PatientDocument[]> {
  const response = await apiFetch(`/patients/${encodeURIComponent(patientId)}/documents`);
  if (!response.ok) {
    throw await toApiError(response, 'No pudimos cargar los documentos del paciente.');
  }
  return (await response.json()) as PatientDocument[];
}

/**
 * Sube un documento como multipart. Sin `Content-Type` a mano: el browser pone
 * el boundary. Un 413 lo corta Multer antes de llegar al backend y viene en
 * inglés, así que se traduce acá.
 */
export async function uploadDocument(input: UploadDocumentInput): Promise<PatientDocument> {
  const form = new FormData();
  form.append('file', input.file);
  form.append('type', input.type);
  form.append('title', input.title);
  if (input.documentDate) form.append('documentDate', input.documentDate);
  if (input.sourceInstitution) form.append('sourceInstitution', input.sourceInstitution);

  const response = await apiFetch('/patients/me/documents', { method: 'POST', body: form });
  if (response.status === 413) throw apiError(413, 'El archivo no puede pasar los 10 MB.');
  if (!response.ok) throw await toApiError(response, 'No pudimos subir el documento.');
  return (await response.json()) as PatientDocument;
}

/** Retira un documento propio: deja de verse, pero queda registrado. */
export async function withdrawDocument(id: string): Promise<void> {
  const response = await apiFetch(`/patients/me/documents/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw await toApiError(response, 'No pudimos retirar el documento.');
}

export async function getDocumentDownload(id: string): Promise<DocumentDownload> {
  const response = await apiFetch(`/patient-documents/${encodeURIComponent(id)}/download`);
  if (!response.ok) throw await toApiError(response, 'No pudimos abrir el documento.');
  return (await response.json()) as DocumentDownload;
}
