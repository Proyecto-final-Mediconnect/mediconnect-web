// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProfessionalProfileForm } from './ProfessionalProfileForm';

const PROFILE = {
  profileId: 'user-1',
  firstName: 'Ana',
  lastName: 'García',
  licenseNumber: 'MP-12345',
  bio: 'Cardióloga.',
  photoUrl: null,
  consultationPrice: 15000,
  currency: 'ARS',
  status: 'ACTIVO',
  specialties: [],
};

const SPECIALTIES = [
  { id: 's1', name: 'Cardiología' },
  { id: 's2', name: 'Clínica Médica' },
  { id: 's3', name: 'Pediatría' },
  { id: 's4', name: 'Dermatología' },
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockFetch() {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input);
    if (url.endsWith('/specialties')) {
      return Promise.resolve(jsonResponse(SPECIALTIES));
    }
    if (url.endsWith('/professionals/me')) {
      return Promise.resolve(jsonResponse(PROFILE));
    }
    return Promise.resolve(jsonResponse({}, 404));
  });
}

function renderForm() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/perfil']}>
        <Routes>
          <Route path="/perfil" element={<ProfessionalProfileForm />} />
          <Route path="/ingresar" element={<p>Pantalla de login</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Último body enviado al PATCH del perfil. */
function lastPatchBody() {
  const calls = vi.mocked(globalThis.fetch).mock.calls;
  const patch = calls.filter(([, init]) => init?.method === 'PATCH').at(-1);
  return JSON.parse(String(patch?.[1]?.body)) as Record<string, unknown>;
}

describe('ProfessionalProfileForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockFetch();
  });

  afterEach(() => {
    cleanup();
  });

  it('carga el perfil y precarga la bio', async () => {
    renderForm();
    expect(await screen.findByDisplayValue('Cardióloga.')).toBeInTheDocument();
  });

  it('permite elegir hasta 3 especialidades y deshabilita el resto', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(await screen.findByRole('button', { name: 'Cardiología' }));
    await user.click(screen.getByRole('button', { name: 'Clínica Médica' }));
    await user.click(screen.getByRole('button', { name: 'Pediatría' }));

    // Con 3 elegidas, la 4ta queda deshabilitada.
    expect(screen.getByRole('button', { name: 'Dermatología' })).toBeDisabled();
  });

  it('muestra el nombre del profesional en la vista previa', async () => {
    renderForm();
    const preview = (await screen.findByText('Vista previa')).closest('div')!;
    expect(within(preview).getByText('Ana García')).toBeInTheDocument();
  });

  it('manda consultationPrice en null al borrar el precio, para que el backend lo borre', async () => {
    const user = userEvent.setup();
    renderForm();

    const price = await screen.findByLabelText(/Precio de consulta/);
    await user.clear(price);
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await screen.findByRole('status');
    // Omitirlo significaría "no lo toques": el precio seguiría publicado mientras
    // la UI dice "Perfil guardado ✓".
    expect(lastPatchBody()).toHaveProperty('consultationPrice', null);
  });

  it('muestra el mensaje del backend cuando falla la carga del perfil', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith('/specialties')) {
        return Promise.resolve(jsonResponse(SPECIALTIES));
      }
      return Promise.resolve(
        jsonResponse(
          { message: 'No pudimos cargar tu perfil. Probá de nuevo en unos minutos.' },
          500,
        ),
      );
    });
    renderForm();

    // Un 5xx puede ser transitorio, así que se reintenta una vez: el cartel
    // aparece después del backoff de react-query (un 4xx no se reintenta).
    const alert = await screen.findByRole('alert', {}, { timeout: 5000 });
    expect(alert).toHaveTextContent(/Probá de nuevo en unos minutos/);
    expect(alert).not.toHaveTextContent('No se pudo cargar tu perfil.');
  });

  it('ante un 401 va al login en vez de quedarse en un cartel de error', async () => {
    vi.mocked(globalThis.fetch).mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith('/specialties')) {
        return Promise.resolve(jsonResponse(SPECIALTIES));
      }
      return Promise.resolve(jsonResponse({ message: 'No se encontró un token de sesión.' }, 401));
    });
    renderForm();

    expect(await screen.findByText('Pantalla de login')).toBeInTheDocument();
  });

  it('rechaza una imagen enorme antes de decodificarla', async () => {
    const user = userEvent.setup();
    const createImageBitmap = vi.fn();
    vi.stubGlobal('createImageBitmap', createImageBitmap);
    renderForm();
    await screen.findByDisplayValue('Cardióloga.');

    const input = screen.getByLabelText('Cambiar foto', { selector: 'input' });
    const huge = new File([new Uint8Array(13 * 1024 * 1024)], 'enorme.png', {
      type: 'image/png',
    });
    await user.upload(input, huge);

    expect(await screen.findByRole('alert')).toHaveTextContent(/menos de 12 MB/);
    // Lo importante: no se decodificó nada en memoria.
    expect(createImageBitmap).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
