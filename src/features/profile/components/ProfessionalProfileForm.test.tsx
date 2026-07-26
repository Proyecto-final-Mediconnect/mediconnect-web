// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
      <ProfessionalProfileForm />
    </QueryClientProvider>,
  );
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
});
