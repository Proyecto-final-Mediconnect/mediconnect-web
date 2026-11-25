// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { IpsSummaryDrawer } from './IpsSummary';
import { PatientDocumentsPanel } from './PatientDocumentsPanel';
import { UploadDocumentForm } from './UploadDocumentForm';
import type { IpsResumen } from '../../patient-profile/lib/ipsImport';
import type { PatientProfile } from '../../patient-profile/types/patientProfile';
import type { PatientDocument } from '../types';

/** ENG-246 — el resumen de salud IPS es un documento más, y se lee ordenado. */

const DOC = '44444444-4444-4444-8444-444444444444';

const RESUMEN_DOC: PatientDocument = {
  id: DOC,
  type: 'INFORME',
  title: 'Resumen de salud',
  documentDate: null,
  sourceInstitution: 'Hospital Pintos',
  mimeType: 'application/fhir+json',
  sizeBytes: 9000,
  uploadedAt: '2026-11-24T15:00:00.000Z',
};

const RESUMEN: IpsResumen = {
  documento: {
    titulo: 'Resumen del paciente al 26 de Enero de 2018, 14:30hs',
    fecha: '2018-01-26T14:30:00-03:00',
  },
  propuesta: {
    allergies: [{ que: 'alergia a la penicilina', gravedad: 'Grave' }],
    medications: [{ droga: 'salbutamol 200 mcg', dosis: '1 disparo' }],
    conditions: [{ nombre: 'asma', codigo: 'SNOMED 195967001' }],
  },
  vacunas: [{ vacuna: 'antigripal', fecha: '2017-05-22' }],
  ignorados: [],
};

const PERFIL: PatientProfile = {
  profileId: 'p-1',
  firstName: 'Julián',
  lastName: 'Sosa',
  birthDate: '1994-03-18',
  dni: '30111222',
  phone: '+54 351 555 0000',
  completed: true,
  sex: null,
  bloodType: '0+',
  allergies: [{ que: 'Penicilina', gravedad: 'Anafilaxia' }],
  medications: null,
  conditions: null,
  emergencyContact: null,
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderWith(ui: ReactElement, responder: (url: string, init?: RequestInit) => Response) {
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation((input, init) => Promise.resolve(responder(String(input), init)));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['patient', 'me'], PERFIL);
  render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return fetchMock;
}

/** El backend de estos tests: el resumen, el perfil y el PUT del MediPass. */
function backend(url: string, init?: RequestInit): Response {
  if (url.endsWith(`/patient-documents/${DOC}/ips`)) return json(RESUMEN);
  if (url.endsWith('/patients/me/vital') && init?.method === 'PUT') {
    return json({ ...PERFIL, ...(JSON.parse(String(init.body)) as object) });
  }
  if (url.endsWith('/patients/me')) return json(PERFIL);
  return json({ message: 'no esperado' }, 500);
}

const enviado = (fetchMock: ReturnType<typeof renderWith>): unknown => {
  const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
  return put ? JSON.parse(String(put[1]?.body)) : undefined;
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('IpsSummaryDrawer (ENG-246)', () => {
  it('muestra el resumen ordenado, marcado como no validado', async () => {
    renderWith(
      <IpsSummaryDrawer documentId={DOC} paraPaciente={false} onClose={() => undefined} />,
      backend,
    );

    expect(
      await screen.findByText('Resumen del paciente al 26 de Enero de 2018, 14:30hs'),
    ).toBeVisible();
    expect(screen.getByText('Del 26 de enero de 2018')).toBeVisible();
    expect(screen.getByText('No validado')).toBeVisible();
    expect(screen.getByText('asma')).toBeVisible();
    expect(screen.getByText('alergia a la penicilina')).toBeVisible();
    expect(screen.getByText('salbutamol 200 mcg')).toBeVisible();
    expect(screen.getByText('antigripal')).toBeVisible();
  });

  it('al profesional no le ofrece tocar el MediPass', async () => {
    renderWith(
      <IpsSummaryDrawer documentId={DOC} paraPaciente={false} onClose={() => undefined} />,
      backend,
    );

    await screen.findByText('asma');
    expect(screen.queryByRole('button', { name: 'Sumar a mi MediPass' })).not.toBeInTheDocument();
  });

  it('el paciente elige qué sumar a su MediPass, sin perder lo que tenía', async () => {
    const fetchMock = renderWith(
      <IpsSummaryDrawer documentId={DOC} paraPaciente onClose={() => undefined} />,
      backend,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Sumar a mi MediPass' }));
    expect(screen.getByRole('checkbox', { name: /alergia a la penicilina/ })).toBeChecked();
    await userEvent.click(screen.getByRole('checkbox', { name: /salbutamol/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Sumar 2 datos a mi MediPass' }));

    expect(await screen.findByText('Listo: ya se ve en tu MediPass.')).toBeVisible();
    expect(enviado(fetchMock)).toEqual({
      bloodType: '0+',
      allergies: [
        { que: 'Penicilina', gravedad: 'Anafilaxia' },
        { que: 'alergia a la penicilina', gravedad: 'Grave' },
      ],
      conditions: [{ nombre: 'asma', codigo: 'SNOMED 195967001' }],
    });
  });

  it('sin nada tildado no deja sumar, y "Volver" no guarda nada', async () => {
    const fetchMock = renderWith(
      <IpsSummaryDrawer documentId={DOC} paraPaciente onClose={() => undefined} />,
      backend,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Sumar a mi MediPass' }));
    for (const nombre of [/alergia a la penicilina/, /salbutamol/, /asma/]) {
      await userEvent.click(screen.getByRole('checkbox', { name: nombre }));
    }
    expect(screen.getByRole('button', { name: 'Sumar 0 datos a mi MediPass' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(await screen.findByRole('button', { name: 'Sumar a mi MediPass' })).toBeVisible();
    expect(enviado(fetchMock)).toBeUndefined();
  });

  it('lo que ya está en el MediPass se marca y no se vuelve a ofrecer', async () => {
    const conAsma: PatientProfile = {
      ...PERFIL,
      conditions: [{ nombre: 'ASMA', codigo: 'SNOMED 195967001' }],
    };
    const fetchMock = renderWith(
      <IpsSummaryDrawer documentId={DOC} paraPaciente onClose={() => undefined} />,
      (url, init) => (url.endsWith('/patients/me') ? json(conAsma) : backend(url, init)),
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Sumar a mi MediPass' }));
    expect(await screen.findByText('Ya está en tu MediPass')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: /asma/ })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Sumar 2 datos a mi MediPass' }));

    await screen.findByText('Listo: ya se ve en tu MediPass.');
    expect((enviado(fetchMock) as { conditions: unknown }).conditions).toEqual([
      { nombre: 'ASMA', codigo: 'SNOMED 195967001' },
    ]);
  });

  it('si ya está todo en el MediPass, lo dice en lugar de ofrecer sumarlo', async () => {
    const completo: PatientProfile = {
      ...PERFIL,
      allergies: [{ que: 'Alergia a la penicilina', gravedad: 'Grave' }],
      medications: [{ droga: 'salbutamol 200 MCG' }],
      conditions: [{ nombre: 'asma' }],
    };
    renderWith(
      <IpsSummaryDrawer documentId={DOC} paraPaciente onClose={() => undefined} />,
      (url, init) => (url.endsWith('/patients/me') ? json(completo) : backend(url, init)),
    );

    expect(await screen.findByText('Ya está todo en tu MediPass.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Sumar a mi MediPass' })).not.toBeInTheDocument();
  });

  it('si no se puede leer el resumen, lo dice', async () => {
    renderWith(<IpsSummaryDrawer documentId={DOC} paraPaciente onClose={() => undefined} />, () =>
      json({ message: 'Ese documento no es un resumen de salud.' }, 404),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ese documento no es un resumen de salud.',
    );
  });
});

describe('el resumen entre los documentos (ENG-246)', () => {
  it('el profesional lo ve con su ícono y "Ver" lo abre ordenado, no como archivo', async () => {
    const fetchMock = renderWith(<PatientDocumentsPanel patientId="p-1" />, (url) =>
      url.includes('/patients/p-1/documents') ? json([RESUMEN_DOC]) : backend(url),
    );

    expect(await screen.findByText('IPS')).toBeInTheDocument();
    const abrir = vi.spyOn(window, 'open');
    await userEvent.click(screen.getByRole('button', { name: 'Ver Resumen de salud' }));

    expect(await screen.findByText('asma')).toBeVisible();
    expect(abrir).not.toHaveBeenCalled();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/download'))).toBe(false);
  });

  it('el paciente sube su resumen en JSON: se propone como informe y se manda como JSON', async () => {
    const onDone = vi.fn();
    const fetchMock = renderWith(
      <UploadDocumentForm onDone={onDone} onCancel={() => undefined} />,
      () => json(RESUMEN_DOC, 201),
    );

    // Sin tipo: algunos sistemas no se lo ponen a un `.json`.
    await userEvent.upload(
      screen.getByLabelText(/elegí un archivo/i),
      new File(['{"resourceType":"Bundle"}'], 'IPS-9000022.json', { type: '' }),
    );
    expect(screen.getByDisplayValue('Resumen de salud')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Informe' })).toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: /subir/i }));

    await vi.waitFor(() => expect(onDone).toHaveBeenCalledWith(RESUMEN_DOC));
    const body = fetchMock.mock.calls[0][1]?.body as FormData;
    expect((body.get('file') as File).type).toBe('application/json');
    expect(body.get('type')).toBe('INFORME');
  });
});
