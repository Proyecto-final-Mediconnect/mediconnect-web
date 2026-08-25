// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProfessionalPublicProfilePage } from './ProfessionalPublicProfilePage';
import type { PublicProfessionalProfile } from '../features/catalog/types/catalog';

const ID = '11111111-1111-4111-8111-111111111111';

const PROFILE: PublicProfessionalProfile = {
  id: ID,
  firstName: 'Ana',
  lastName: 'Álvarez',
  photoUrl: null,
  bio: 'Cardióloga con 10 años de experiencia.',
  specialties: [
    { id: 'spec-1', name: 'Cardiología' },
    { id: 'spec-2', name: 'Clínica Médica' },
  ],
  education: [
    { id: 'edu-1', institution: 'UNC', degree: 'Medicina', year: 2014 },
    { id: 'edu-2', institution: 'Hospital Italiano', degree: 'Residencia', year: null },
  ],
  price: 12000,
  currency: 'ARS',
};

function mockFetch(status: number, body: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

function renderPage() {
  // El caso 404 no necesita `retry: false`: la propia política del hook no
  // reintenta ante un 404 (ver usePublicProfile.test.ts). Los errores que sí se
  // reintentan se prueban en PublicProfile.test.tsx, sobre el componente.
  const client = new QueryClient();

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/profesionales/${ID}`]}>
        <Routes>
          <Route
            path="/profesionales/:professionalId"
            element={<ProfessionalPublicProfilePage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ProfessionalPublicProfilePage', () => {
  it('muestra los datos públicos del profesional', async () => {
    mockFetch(200, PROFILE);
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Ana Álvarez' })).toBeVisible();
    expect(screen.getByText('Cardiología · Clínica Médica')).toBeVisible();
    expect(screen.getByText(/12\.000/)).toBeVisible();
    expect(screen.getByText('Cardióloga con 10 años de experiencia.')).toBeVisible();
  });

  it('lista la formación y omite el año cuando el profesional no lo cargó', async () => {
    mockFetch(200, PROFILE);
    renderPage();

    expect(await screen.findByText('Medicina — UNC (2014)')).toBeVisible();
    expect(screen.getByText('Residencia — Hospital Italiano')).toBeVisible();
  });

  it('el botón de reservar apunta al flujo de turnos de ese profesional', async () => {
    mockFetch(200, PROFILE);
    renderPage();

    const reservar = await screen.findByRole('link', {
      name: 'Reservar turno con Ana Álvarez',
    });
    expect(reservar).toHaveAttribute('href', `/profesionales/${ID}/turnos`);
  });

  it('cae a las iniciales cuando no hay foto', async () => {
    mockFetch(200, PROFILE);
    renderPage();

    expect(await screen.findByText('AÁ')).toBeInTheDocument();
    expect(screen.queryByAltText('Foto de Ana Álvarez')).not.toBeInTheDocument();
  });

  it('ante un 404 avisa que no existe y ofrece volver al catálogo', async () => {
    mockFetch(404, { message: 'Profesional no encontrado' });
    renderPage();

    expect(await screen.findByText('No encontramos este profesional')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Volver al catálogo' })).toHaveAttribute(
      'href',
      '/profesionales',
    );
    // El 404 no es un error recuperable: no tiene sentido ofrecer reintentar.
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  });

  it('ante un id malformado (400) muestra el mismo estado que un 404, sin spinner de más', async () => {
    // El backend valida el id con ParseUUIDPipe: /profesionales/juan-perez
    // responde 400. Si no se cortara el reintento, el usuario vería "Cargando
    // perfil…" durante el backoff de react-query antes del mensaje.
    mockFetch(400, { message: 'Validation failed (uuid is expected)' });
    renderPage();

    expect(await screen.findByText('No encontramos este profesional')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument();
  });

  it('no oculta el precio a consultar cuando el profesional no cargó precio', async () => {
    mockFetch(200, { ...PROFILE, price: null });
    renderPage();

    expect(await screen.findByText('Precio a consultar')).toBeVisible();
  });

  it('omite las secciones vacías en vez de mostrarlas sin contenido', async () => {
    mockFetch(200, { ...PROFILE, bio: null, education: [] });
    renderPage();

    await screen.findByRole('heading', { name: 'Ana Álvarez' });
    expect(screen.queryByText('Sobre mí')).not.toBeInTheDocument();
    expect(screen.queryByText('Formación')).not.toBeInTheDocument();
  });
});
