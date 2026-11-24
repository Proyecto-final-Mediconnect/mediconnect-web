// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IpsImport } from './IpsImport';
import type { IpsPreview } from '../lib/ipsImport';
import type { PatientProfile } from '../types/patientProfile';

/** ENG-246 — el paciente importa su resumen de salud IPS y elige qué cargar. */

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

const PREVIEW: IpsPreview = {
  documento: {
    titulo: 'Resumen del paciente al 26 de Enero de 2018, 14:30hs',
    fecha: '2018-01-26T14:30:00-03:00',
    dniCoincide: true,
  },
  propuesta: {
    allergies: [{ que: 'alergia a la penicilina', gravedad: 'Grave' }],
    medications: [{ droga: 'salbutamol 200 mcg', dosis: '1 disparo' }],
    conditions: [{ nombre: 'asma', codigo: 'SNOMED 195967001' }],
  },
  vacunas: [{ vacuna: 'antigripal', fecha: '2017-05-22' }],
  ignorados: [],
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function montar({ preview = (): Response => json(PREVIEW) }: { preview?: () => Response } = {}) {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    if (String(input).endsWith('/patients/me/ips/preview')) return Promise.resolve(preview());
    if (init?.method === 'PUT') {
      return Promise.resolve(json({ ...PERFIL, ...(JSON.parse(String(init.body)) as object) }));
    }
    return Promise.resolve(json(PERFIL));
  });
  const onDone = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['patient', 'me'], PERFIL);
  render(
    <QueryClientProvider client={client}>
      <IpsImport onDone={onDone} />
    </QueryClientProvider>,
  );
  return { fetchMock, onDone };
}

function archivo(contenido: string): File {
  return new File([contenido], 'resumen.json', { type: 'application/json' });
}

const elegir = (f: File) => userEvent.upload(screen.getByLabelText(/Elegir el archivo/), f);

function enviadoPor(fetchMock: ReturnType<typeof montar>['fetchMock'], metodo: string): unknown {
  const llamada = fetchMock.mock.calls.find(([, init]) => init?.method === metodo);
  return llamada ? JSON.parse(String(llamada[1]?.body)) : undefined;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('IpsImport (ENG-246)', () => {
  it('manda el documento tal cual y muestra la propuesta, todo tildado', async () => {
    const { fetchMock } = montar();

    await elegir(archivo('{"resourceType":"Bundle","type":"document"}'));

    expect(
      await screen.findByText('Resumen del paciente al 26 de Enero de 2018, 14:30hs'),
    ).toBeVisible();
    expect(screen.getByText('Del 26 de enero de 2018')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: /alergia a la penicilina/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /salbutamol 200 mcg/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /asma/ })).toBeChecked();
    expect(screen.getByText('El MediPass no guarda vacunas.')).toBeVisible();
    expect(enviadoPor(fetchMock, 'POST')).toEqual({ resourceType: 'Bundle', type: 'document' });
    // Hasta confirmar no se guarda nada.
    expect(enviadoPor(fetchMock, 'PUT')).toBeUndefined();
  });

  it('carga solo lo elegido, sumado a lo que ya tenía', async () => {
    const { fetchMock, onDone } = montar();
    await elegir(archivo('{}'));

    await userEvent.click(await screen.findByRole('checkbox', { name: /salbutamol/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cargar 2 datos en mi MediPass' }));

    await vi.waitFor(() => expect(onDone).toHaveBeenCalledWith(true));
    expect(enviadoPor(fetchMock, 'PUT')).toEqual({
      bloodType: '0+',
      allergies: [
        { que: 'Penicilina', gravedad: 'Anafilaxia' },
        { que: 'alergia a la penicilina', gravedad: 'Grave' },
      ],
      conditions: [{ nombre: 'asma', codigo: 'SNOMED 195967001' }],
    });
  });

  it('avisa si el DNI del resumen no es el del paciente', async () => {
    montar({
      preview: () => json({ ...PREVIEW, documento: { ...PREVIEW.documento, dniCoincide: false } }),
    });

    await elegir(archivo('{}'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El DNI de este resumen no es el tuyo.',
    );
  });

  it('un archivo que no es JSON no se manda', async () => {
    const { fetchMock } = montar();

    await elegir(archivo('no es json'));

    expect(await screen.findByRole('alert')).toHaveTextContent(/en formato JSON/);
    expect(enviadoPor(fetchMock, 'POST')).toBeUndefined();
  });

  it('muestra el error del backend si no es un resumen IPS', async () => {
    montar({
      preview: () =>
        json(
          {
            message:
              'El archivo no es un resumen de salud IPS: tiene que ser un documento FHIR (Bundle de tipo "document").',
          },
          400,
        ),
    });

    await elegir(archivo('{"resourceType":"Patient"}'));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no es un resumen de salud IPS/);
  });

  it('sin nada tildado no deja cargar', async () => {
    montar();
    await elegir(archivo('{}'));

    for (const nombre of [/alergia a la penicilina/, /salbutamol/, /asma/]) {
      await userEvent.click(await screen.findByRole('checkbox', { name: nombre }));
    }

    expect(screen.getByRole('button', { name: 'Cargar 0 datos en mi MediPass' })).toBeDisabled();
  });
});
