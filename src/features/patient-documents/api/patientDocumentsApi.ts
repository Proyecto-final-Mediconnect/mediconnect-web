import { apiFetch } from '../../../shared/api/apiFetch';
import { apiError, toApiError } from '../../../shared/api/apiError';
import { MAX_ACTIVE_DOCUMENTS } from '../lib/documents';
import type { DocumentDownload, PatientDocument, UploadDocumentInput } from '../types';

/**
 * El listado pagina (`limit`/`offset`) y devuelve un array. Se pide el tope de
 * documentos vigentes para que entren todos, y se chequea la forma: si algún día
 * viniera envuelta (`{ items, total }`), mejor un error claro que una lista que
 * rompe más adelante.
 */
async function leerLista(response: Response, fallback: string): Promise<PatientDocument[]> {
  const data: unknown = await response.json().catch(() => null);
  if (!Array.isArray(data)) throw apiError(response.status, fallback);
  return data as PatientDocument[];
}

const PAGINA = `?limit=${MAX_ACTIVE_DOCUMENTS}`;

/** Documentos propios, vigentes, del más nuevo al más viejo. */
export async function getMyDocuments(): Promise<PatientDocument[]> {
  const response = await apiFetch(`/patients/me/documents${PAGINA}`);
  if (!response.ok) throw await toApiError(response, 'No pudimos cargar tus documentos.');
  return leerLista(response, 'No pudimos cargar tus documentos.');
}

/** Los de un paciente, para el profesional que puede leer su historia. */
export async function getPatientDocuments(patientId: string): Promise<PatientDocument[]> {
  const response = await apiFetch(`/patients/${encodeURIComponent(patientId)}/documents${PAGINA}`);
  if (!response.ok) {
    throw await toApiError(response, 'No pudimos cargar los documentos del paciente.');
  }
  return leerLista(response, 'No pudimos cargar los documentos del paciente.');
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

/**
 * Retira un documento propio: deja de verse, pero queda registrado.
 *
 * Un 404 es que ya estaba retirado (otra pestaña, otro dispositivo, doble
 * click): lo que el paciente pidió ya pasó, así que cuenta como hecho y la lista
 * se refresca. Si no, el diálogo quedaría reintentando contra un 404 para siempre.
 */
export async function withdrawDocument(id: string): Promise<void> {
  const response = await apiFetch(`/patients/me/documents/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (response.status === 404) return;
  if (!response.ok) throw await toApiError(response, 'No pudimos retirar el documento.');
}

export async function getDocumentDownload(id: string): Promise<DocumentDownload> {
  const response = await apiFetch(`/patient-documents/${encodeURIComponent(id)}/download`);
  if (!response.ok) throw await toApiError(response, 'No pudimos abrir el documento.');
  return (await response.json()) as DocumentDownload;
}
