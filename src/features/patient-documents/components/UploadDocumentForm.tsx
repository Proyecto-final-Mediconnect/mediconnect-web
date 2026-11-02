import { useId, useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { useUploadDocument } from '../hooks/usePatientDocuments';
import {
  ACCEPTED_MIME,
  fileProblem,
  formatSize,
  suggestedTitle,
  TYPE_LABELS,
} from '../lib/documents';
import { DOCUMENT_TYPES, type DocumentType } from '../types';
import { DocumentIcon } from './DocumentRow';

/**
 * Subir un documento (ENG-164): el archivo, qué es, cómo se llama, de cuándo y
 * de dónde. Solo el archivo, el tipo y el nombre son obligatorios: un paciente
 * con una receta en la mano no siempre sabe la fecha exacta del estudio.
 */
export function UploadDocumentForm({
  onDone,
  onCancel,
}: {
  onDone: () => void;
  onCancel: () => void;
}) {
  const upload = useUploadDocument();
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [type, setType] = useState<DocumentType>('ESTUDIO');
  const [title, setTitle] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [sourceInstitution, setSourceInstitution] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const inputId = useId();

  function elegir(elegido: File | undefined) {
    if (!elegido) return;
    const problema = fileProblem(elegido);
    setFileError(problema);
    setFile(problema ? null : elegido);
    if (!problema && !title) setTitle(suggestedTitle(elegido));
  }

  function subir(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setFileError('Elegí el archivo que querés subir.');
      return;
    }
    if (!title.trim()) {
      setTitleError('Ponele un nombre al documento.');
      return;
    }
    upload.mutate(
      {
        file,
        type,
        title: title.trim(),
        documentDate: documentDate || undefined,
        sourceInstitution: sourceInstitution.trim() || undefined,
      },
      { onSuccess: onDone },
    );
  }

  return (
    <form onSubmit={subir} noValidate className="grid gap-5">
      {/* El archivo. Es un label sobre el input para que toda la caja se pueda
          tocar, y acepta soltar un archivo encima. */}
      {file ? (
        <div className="flex items-center gap-3.5 rounded-[12px] border border-line bg-surface px-4 py-3">
          <DocumentIcon mimeType={file.type} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold text-brand-deep">
              {file.name}
            </span>
            <span className="block text-[12.5px] text-muted">{formatSize(file.size)}</span>
          </span>
          <button
            type="button"
            onClick={() => setFile(null)}
            disabled={upload.isPending}
            className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-brand-hover hover:bg-surface-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Cambiar
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            elegir(e.dataTransfer.files[0]);
          }}
          className={`grid cursor-pointer justify-items-center gap-1.5 rounded-[12px] border-2 border-dashed px-4 py-7 text-center transition-colors hover:border-brand hover:bg-surface-teal ${
            fileError ? 'border-danger/50' : 'border-line-strong'
          }`}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-7 text-brand-hover"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5" />
            <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
          </svg>
          <span className="text-[14px] font-semibold text-brand-deep">
            Elegí un archivo o soltalo acá
          </span>
          <span className="text-[12.5px] text-muted">PDF, JPG o PNG · hasta 10 MB</span>
          <input
            id={inputId}
            type="file"
            accept={ACCEPTED_MIME.join(',')}
            className="sr-only"
            aria-label="Archivo"
            onChange={(e) => elegir(e.target.files?.[0])}
          />
        </label>
      )}
      {fileError && (
        <p role="alert" className="-mt-3 text-[13px] text-danger">
          {fileError}
        </p>
      )}

      <div className="grid gap-2">
        <span id="tipo-doc" className={ROTULO}>
          Qué es
        </span>
        <div role="radiogroup" aria-labelledby="tipo-doc" className="flex flex-wrap gap-2">
          {DOCUMENT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              onClick={() => setType(t)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                type === t
                  ? 'bg-brand-deep text-white'
                  : 'bg-white text-brand-deep ring-1 ring-line-strong hover:ring-brand'
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <label className="grid gap-1.5">
        <span className={ROTULO}>Nombre</span>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setTitleError(null);
          }}
          maxLength={120}
          placeholder="Análisis de sangre completo"
          aria-invalid={!!titleError}
          className={`${CAMPO} ${titleError ? 'border-danger' : ''}`}
        />
        {titleError && <span className="text-[12px] text-danger">{titleError}</span>}
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className={ROTULO}>Fecha del documento (opcional)</span>
          <input
            type="date"
            value={documentDate}
            onChange={(e) => setDocumentDate(e.target.value)}
            className={CAMPO}
          />
        </label>
        <label className="grid gap-1.5">
          <span className={ROTULO}>Institución (opcional)</span>
          <input
            value={sourceInstitution}
            onChange={(e) => setSourceInstitution(e.target.value)}
            maxLength={120}
            placeholder="Hospital Privado"
            className={CAMPO}
          />
        </label>
      </div>

      {upload.isPending && (
        // `fetch` no informa cuánto subió: una barra indeterminada dice que está
        // pasando algo sin inventar un porcentaje.
        <div
          role="status"
          aria-label="Subiendo"
          className="h-1.5 overflow-hidden rounded-full bg-line-soft"
        >
          <div className="h-full w-1/3 animate-[subiendo_1.1s_ease-in-out_infinite] rounded-full bg-brand" />
        </div>
      )}
      {upload.isError && (
        <p
          role="alert"
          className="rounded-[10px] border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger"
        >
          {upload.error.message}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={upload.isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={upload.isPending}>
          {upload.isPending ? 'Subiendo…' : 'Subir documento'}
        </Button>
      </div>
    </form>
  );
}

const ROTULO = 'text-[11px] font-semibold uppercase tracking-[0.1em] text-muted';
const CAMPO =
  'w-full rounded-[10px] border border-line-strong bg-white px-3.5 py-2.5 text-[14px] font-medium text-ink outline-none transition-colors placeholder:font-normal placeholder:text-muted-soft focus:border-brand focus:ring-2 focus:ring-brand/25';
