/**
 * Documentación clínica previa que aporta el paciente (ENG-164): el contrato de
 * backend#90. **No es historia clínica**: va fuera de la cadena de hash y se
 * muestra como "aportado por el paciente · no validado".
 */

export const DOCUMENT_TYPES = ['ESTUDIO', 'EPICRISIS', 'INFORME', 'RECETA', 'OTRO'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export interface PatientDocument {
  id: string;
  type: DocumentType;
  title: string;
  /** `AAAA-MM-DD`: la fecha del estudio, no la de la subida. */
  documentDate: string | null;
  sourceInstitution: string | null;
  mimeType: string;
  sizeBytes: number;
  /** ISO-8601. */
  uploadedAt: string;
}

export interface UploadDocumentInput {
  file: File;
  type: DocumentType;
  title: string;
  documentDate?: string;
  sourceInstitution?: string;
}

/** `GET /patient-documents/:id/download`: una URL firmada de cinco minutos. */
export interface DocumentDownload {
  url: string;
  expiresAt: string;
}
