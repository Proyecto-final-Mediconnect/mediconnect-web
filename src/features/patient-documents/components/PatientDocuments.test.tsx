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

    await userEvent.upload(screen.getByLabelText(/elegí un archivo/i), pdf());
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
      screen.getByLabelText(/elegí un archivo/i),
      new File(['x'], 'notas.docx', { type: 'application/msword' }),
      { applyAccept: false },
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Solo se pueden subir PDF, JPG o PNG.');
    await userEvent.click(screen.getByRole('button', { name: 'Subir documento' }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['vacío', new File([], 'vacio.pdf', { type: 'application/pdf' }), 'El archivo está vacío.'],
    [
      'de más de 10 MB',
      new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'grande.pdf', { type: 'application/pdf' }),
      'El archivo no puede pasar los 10 MB.',
    ],
  ])('un archivo %s se rechaza sin subir nada', async (_caso, archivo, mensaje) => {
    const fetchMock = renderWith(
      <UploadDocumentForm onDone={() => undefined} onCancel={() => undefined} />,
      () => json(HEMOGRAMA, 201),
    );

    await userEvent.upload(screen.getByLabelText(/elegí un archivo/i), archivo);

    expect(screen.getByRole('alert')).toHaveTextContent(mensaje);
    await userEvent.click(screen.getByRole('button', { name: 'Subir documento' }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('el 413 que corta Multer en inglés se muestra traducido', async () => {
    renderWith(<UploadDocumentForm onDone={() => undefined} onCancel={() => undefined} />, () =>
      json({ message: 'File too large' }, 413),
    );

    await userEvent.upload(screen.getByLabelText(/elegí un archivo/i), pdf());
    await userEvent.click(screen.getByRole('button', { name: 'Subir documento' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El archivo no puede pasar los 10 MB.',
    );
  });

  it('el tipo es un grupo de radios de verdad: se mueve con las flechas', async () => {
    renderWith(<UploadDocumentForm onDone={() => undefined} onCancel={() => undefined} />, () =>
      json(HEMOGRAMA, 201),
    );

    await userEvent.click(screen.getByRole('radio', { name: 'Estudio' }));
    await userEvent.keyboard('{ArrowRight}');

    expect(screen.getByRole('radio', { name: 'Epicrisis' })).toBeChecked();
  });

  it('no deja elegir una fecha futura', async () => {
    const fetchMock = renderWith(
      <UploadDocumentForm onDone={() => undefined} onCancel={() => undefined} />,
      () => json(HEMOGRAMA, 201),
    );
    const fecha = screen.getByLabelText(/fecha del documento/i);
    expect(fecha).toHaveAttribute('max');

    await userEvent.upload(screen.getByLabelText(/elegí un archivo/i), pdf());
    await userEvent.type(fecha, '2999-01-01');
    await userEvent.click(screen.getByRole('button', { name: 'Subir documento' }));

    expect(screen.getByText('La fecha no puede ser futura.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('si el backend lo rechaza, muestra su mensaje', async () => {
    renderWith(<UploadDocumentForm onDone={() => undefined} onCancel={() => undefined} />, () =>
      json({ message: 'Completá tu perfil de paciente antes de subir documentos.' }, 409),
    );

    await userEvent.upload(screen.getByLabelText(/elegí un archivo/i), pdf());
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

  it('si el documento ya estaba retirado (404), cierra el diálogo y refresca la lista', async () => {
    let retirado = false;
    renderWith(<MyDocuments onUpload={() => undefined} />, (_url, init) => {
      if (init?.method === 'DELETE') {
        retirado = true;
        return json({ message: 'No encontramos ese documento.' }, 404);
      }
      return json(retirado ? [] : [HEMOGRAMA]);
    });

    await userEvent.click(await screen.findByRole('button', { name: 'Retirar Hemograma' }));
    const dialogo = screen.getByRole('dialog', { hidden: true });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Retirar', hidden: true }));

    expect(await screen.findByRole('button', { name: /subir el primero/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { hidden: true })).not.toBeInTheDocument();
  });

  it('si el retiro falla, lo dice dentro del diálogo', async () => {
    renderWith(<MyDocuments onUpload={() => undefined} />, (_url, init) =>
      init?.method === 'DELETE' ? json({ message: 'boom' }, 500) : json([HEMOGRAMA]),
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Retirar Hemograma' }));
    const dialogo = screen.getByRole('dialog', { hidden: true });
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Retirar', hidden: true }));

    expect(await within(dialogo).findByRole('alert', { hidden: true })).toHaveTextContent('boom');
  });

  it('ver abre la URL firmada en otra pestaña, sin acceso a esta', async () => {
    const pestaña = { opener: window, location: { href: '' }, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(pestaña as unknown as Window);
    renderWith(<MyDocuments onUpload={() => undefined} />, (url) =>
      url.includes('/download')
        ? json({ url: 'https://x/firmada', expiresAt: '' })
        : json([HEMOGRAMA]),
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Ver Hemograma' }));

    await vi.waitFor(() => expect(pestaña.location.href).toBe('https://x/firmada'));
    expect(pestaña.opener).toBeNull();
  });

  it('si no se puede abrir, cierra la pestaña que quedó en blanco y lo dice', async () => {
    const pestaña = { opener: window, location: { href: '' }, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(pestaña as unknown as Window);
    renderWith(<MyDocuments onUpload={() => undefined} />, (url) =>
      url.includes('/download')
        ? json({ message: 'No encontramos ese documento.' }, 404)
        : json([HEMOGRAMA]),
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Ver Hemograma' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No encontramos ese documento.');
    expect(pestaña.close).toHaveBeenCalled();
  });

  it('no navega a una URL que no sea https', async () => {
    const pestaña = { opener: window, location: { href: '' }, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(pestaña as unknown as Window);
    renderWith(<MyDocuments onUpload={() => undefined} />, (url) =>
      url.includes('/download')
        ? json({ url: 'javascript:alert(1)', expiresAt: '' })
        : json([HEMOGRAMA]),
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Ver Hemograma' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos abrir el documento.');
    expect(pestaña.location.href).toBe('');
    expect(pestaña.close).toHaveBeenCalled();
  });

  it('con la pestaña bloqueada avisa y no saca al paciente de la app', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const fetchMock = renderWith(<MyDocuments onUpload={() => undefined} />, () =>
      json([HEMOGRAMA]),
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Ver Hemograma' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/bloqueó la pestaña/i);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/download'))).toBe(false);
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
