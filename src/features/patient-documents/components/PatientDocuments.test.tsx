// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { MyDocuments } from './MyDocuments';
import { PatientDocumentsPanel } from './PatientDocumentsPanel';
import { UploadDocumentForm } from './UploadDocumentForm';
import type { PatientDocument } from '../types';

/** ENG-164 — el paciente sube su documentación previa y el profesional la ve aparte. */

const HEMOGRAMA: PatientDocument = {
  id: '33333333-3333-4333-8333-333333333333',
  type: 'ESTUDIO',
  title: 'Hemograma',
  documentDate: '2026-09-10',
  sourceInstitution: 'Hospital Privado',
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  uploadedAt: '2026-11-02T15:00:00.000Z',
};

function json(body: unknown, status = 200): Response {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderWith(ui: ReactElement, responder: (url: string, init?: RequestInit) => Response) {
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation((input, init) => Promise.resolve(responder(String(input), init)));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return fetchMock;
}

const pdf = () => new File(['%PDF-1.7'], 'hemograma_marzo.pdf', { type: 'application/pdf' });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('UploadDocumentForm', () => {
  it('sube el archivo con su tipo, nombre y datos como multipart', async () => {
    const onDone = vi.fn();
    const fetchMock = renderWith(
      <UploadDocumentForm onDone={onDone} onCancel={() => undefined} />,
      () => json(HEMOGRAMA, 201),
    );

    await userEvent.upload(screen.getByLabelText('Archivo'), pdf());
    // El nombre sale del archivo, y se puede cambiar.
    expect(screen.getByDisplayValue('hemograma marzo')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Informe' }));
    await userEvent.type(screen.getByPlaceholderText('Hospital Privado'), 'Sanatorio Allende');
    await userEvent.click(screen.getByRole('button', { name: 'Subir documento' }));

    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/patients\/me\/documents$/);
    const body = init?.body as FormData;
    expect(body.get('file')).toBeInstanceOf(File);
    expect(body.get('type')).toBe('INFORME');
    expect(body.get('title')).toBe('hemograma marzo');
    expect(body.get('sourceInstitution')).toBe('Sanatorio Allende');
    expect(body.has('documentDate')).toBe(false);
  });

  it('un archivo que no es PDF ni imagen se rechaza sin subir nada', async () => {
    const fetchMock = renderWith(
      <UploadDocumentForm onDone={() => undefined} onCancel={() => undefined} />,
      () => json(HEMOGRAMA, 201),
    );

    await userEvent.upload(
      screen.getByLabelText('Archivo'),
      new File(['x'], 'notas.docx', { type: 'application/msword' }),
      { applyAccept: false },
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Solo se pueden subir PDF, JPG o PNG.');
    await userEvent.click(screen.getByRole('button', { name: 'Subir documento' }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('si el backend lo rechaza, muestra su mensaje', async () => {
    renderWith(<UploadDocumentForm onDone={() => undefined} onCancel={() => undefined} />, () =>
      json({ message: 'Completá tu perfil de paciente antes de subir documentos.' }, 409),
    );

    await userEvent.upload(screen.getByLabelText('Archivo'), pdf());
    await userEvent.click(screen.getByRole('button', { name: 'Subir documento' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/completá tu perfil/i);
  });
});

describe('MyDocuments', () => {
  it('lista los documentos con su tipo, fecha e institución', async () => {
    renderWith(<MyDocuments onUpload={() => undefined} />, () => json([HEMOGRAMA]));

    expect(await screen.findByText('Hemograma')).toBeInTheDocument();
    expect(screen.getByRole('listitem')).toHaveTextContent(
      /Estudio · 10 de sept\.? de 2026 · Hospital Privado · 2 KB/,
    );
  });

  it('sin documentos invita a subir el primero', async () => {
    const onUpload = vi.fn();
    renderWith(<MyDocuments onUpload={onUpload} />, () => json([]));

    await userEvent.click(await screen.findByRole('button', { name: /subir el primero/i }));
    expect(onUpload).toHaveBeenCalled();
  });

  it('retirar pide confirmación y manda el DELETE', async () => {
    const fetchMock = renderWith(<MyDocuments onUpload={() => undefined} />, (_url, init) =>
      init?.method === 'DELETE' ? json(null, 204) : json([HEMOGRAMA]),
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Retirar Hemograma' }));
    const dialogo = screen.getByRole('dialog', { hidden: true });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Retirar', hidden: true }));

    await vi.waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url, init]) =>
            init?.method === 'DELETE' &&
            String(url).endsWith(`/patients/me/documents/${HEMOGRAMA.id}`),
        ),
      ).toBe(true),
    );
  });

  it('ver abre la URL firmada en otra pestaña', async () => {
    const pestaña = { location: { href: '' }, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(pestaña as unknown as Window);
    renderWith(<MyDocuments onUpload={() => undefined} />, (url) =>
      url.includes('/download')
        ? json({ url: 'https://x/firmada', expiresAt: '' })
        : json([HEMOGRAMA]),
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Ver Hemograma' }));

    await vi.waitFor(() => expect(pestaña.location.href).toBe('https://x/firmada'));
  });
});

describe('PatientDocumentsPanel', () => {
  it('el profesional ve lo aportado marcado como no validado', async () => {
    renderWith(<PatientDocumentsPanel patientId="p-1" />, () => json([HEMOGRAMA]));

    expect(
      await screen.findByRole('heading', { name: 'Documentación aportada por el paciente' }),
    ).toBeInTheDocument();
    expect(screen.getByText('No validado')).toBeInTheDocument();
    expect(screen.getByText('Hemograma')).toBeInTheDocument();
  });

  it('sin documentos no ocupa lugar', async () => {
    const fetchMock = renderWith(<PatientDocumentsPanel patientId="p-1" />, () => json([]));

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
